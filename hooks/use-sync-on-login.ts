"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { maintenanceErrorFromResponse } from "@/lib/api/api-fetch";
import { authClient } from "@/lib/auth/auth-client";
import { setIsSignedIn } from "@/lib/auth/session-state";
import { db } from "@/lib/db/db";
import { clearSyncNotifications } from "@/lib/db/notifications";
import type { Collection, Recipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";
import {
  normalizePulledRecipes,
  runStartupMigrations,
} from "@/lib/sync/startup-migrations";
import {
  applyReconcile,
  parseTimestamps,
  syncIngredients,
  syncPantry,
  syncParseHistory,
} from "@/lib/sync/sync-entities";
import { captureError } from "@/lib/telemetry";

// Stable id so repeat failures replace the toast rather than stack.
const SYNC_FAILURE_TOAST_ID = "sync-failure";

async function isMaintenanceBlocked(response: Response): Promise<boolean> {
  return (await maintenanceErrorFromResponse(response)) !== null;
}

export function useSyncOnLogin() {
  const t = useTranslations("common");
  const { data: session } = authClient.useSession();
  const hasSynced = useRef(false);
  const migrationsStarted = useRef(false);

  useEffect(() => {
    setIsSignedIn(!!session);
  }, [session]);

  // Startup Dexie upgrades: self-limiting and unawaited, so they never gate
  // the UI. The ref keeps Strict Mode's double-invoke from starting them twice.
  useEffect(() => {
    if (migrationsStarted.current) return;
    migrationsStarted.current = true;
    runStartupMigrations();
  }, []);

  const inFlightRef = useRef<Promise<void> | null>(null);
  const syncRef = useRef<(() => Promise<void>) | null>(null);

  const runSync = useCallback(async () => {
    if (!session) return;

    try {
      // All five branches are covered by this one Promise.all so a caller
      // awaiting sync() (triggerSync, the focus re-pull) only resolves once
      // every branch has settled — not just the recipes/collections diff.
      // ingredients/pantry/parse-history already swallow their own errors, so
      // they can never reject this Promise.all; only recipes/collections
      // failures reach the catch below.
      const [recipesRes, collectionsRes] = await Promise.all([
        fetch(api.recipesSync),
        fetch(api.collections),
        syncIngredients().catch(() => {}),
        syncPantry().catch(() => {}),
        syncParseHistory().catch(() => {}),
      ]);

      if (
        (await isMaintenanceBlocked(recipesRes)) ||
        (await isMaintenanceBlocked(collectionsRes))
      )
        return;

      if (!recipesRes.ok || !collectionsRes.ok) {
        throw new Error("Server sync failed");
      }

      const { recipes: rawServerRecipes } = await recipesRes.json();
      const { collections: rawServerCollections } = await collectionsRes.json();

      // A malformed-but-ok body (no array) would look like an empty server and
      // wrongly delete every synced local row — treat it as a failed sync.
      if (
        !Array.isArray(rawServerRecipes) ||
        !Array.isArray(rawServerCollections)
      )
        throw new Error("Malformed sync response");

      const serverRecipes = parseTimestamps<Recipe>(rawServerRecipes);
      const serverCollections =
        parseTimestamps<Collection>(rawServerCollections);

      const [localRecipes, localCollections] = await Promise.all([
        db.recipes.toArray(),
        db.collections.toArray(),
      ]);

      const now = Date.now();

      // Server-wins reconciliation, applied silently (no review screen).
      await applyReconcile<Recipe>(localRecipes, serverRecipes, {
        table: db.recipes,
        syncEndpoint: api.recipesSync,
        bodyKey: "recipes",
        now,
      });
      await applyReconcile<Collection>(localCollections, serverCollections, {
        table: db.collections,
        syncEndpoint: api.collectionsSync,
        bodyKey: "collections",
        now,
      });

      normalizePulledRecipes();

      // Drop any leftover review notifications from before the server-wins
      // rework so the bell's stale "needs review" badge clears.
      await clearSyncNotifications();
    } catch (error) {
      hasSynced.current = false;
      // Offline drops are expected in this local-first app, but a failure while
      // we're online is a genuine problem — a server error or a reconcile bug —
      // and must not be invisible. Report and surface only those: being offline
      // is a normal state here, not something to nag about, and this runs again
      // on every foreground so an unconditional toast repeats endlessly.
      if (typeof navigator === "undefined" || navigator.onLine) {
        captureError(error, { tags: { source: "sync-on-login" } });
        toast.error(t("syncFailed"), {
          // A stable id collapses repeats (mount racing a focus re-pull) into
          // one toast instead of stacking them.
          id: SYNC_FAILURE_TOAST_ID,
          action: {
            label: t("retry"),
            onClick: () => void syncRef.current?.(),
          },
        });
      }
    }
  }, [session, t]);

  // Single-flight: a caller that invokes sync() while one is already running
  // (initial mount racing a manual pull-to-refresh, or a focus re-pull racing
  // either) gets back the same in-flight promise instead of starting a second,
  // overlapping run — the fire-and-forget branches above would otherwise fire
  // twice (e.g. duplicate ingredients-enrich POSTs).
  const sync = useCallback(() => {
    if (inFlightRef.current) return inFlightRef.current;
    const promise = runSync().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = promise;
    return promise;
  }, [runSync]);

  // The failure toast's Retry needs `sync`, which is defined in terms of
  // runSync — so runSync reaches it through this ref rather than a cycle.
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  useEffect(() => {
    if (!session || hasSynced.current) return;
    hasSynced.current = true;
    sync();
  }, [session, sync]);

  // Re-pull when the app regains focus so recipes parsed elsewhere (e.g. the
  // Telegram bot) surface without a manual reload. The in-flight guard avoids
  // overlapping pulls; reconciliation is silent, so a repeat focus is quiet.
  useEffect(() => {
    if (!session) return;
    let running = false;
    const onVisibility = async () => {
      if (document.visibilityState !== "visible" || running) return;
      running = true;
      try {
        await sync();
      } finally {
        running = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [session, sync]);

  const triggerSync = useCallback(async () => {
    hasSynced.current = false;
    await sync();
    hasSynced.current = true;
  }, [sync]);

  return { triggerSync };
}
