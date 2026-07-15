"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { maintenanceErrorFromResponse } from "@/lib/api/api-fetch";
import { authClient } from "@/lib/auth/auth-client";
import { setIsSignedIn } from "@/lib/auth/session-state";
import { db } from "@/lib/db/db";
import { replaceSyncNotifications } from "@/lib/db/notifications";
import { bulkPutPantry, clearPantry } from "@/lib/db/pantry";
import { bulkPutParseHistory } from "@/lib/db/parse-history";
import {
  type Collection,
  INGREDIENT_STATUS,
  type PantryItem,
  type ParseHistoryEntry,
  type Recipe,
  type SyncEntityType,
  type SyncNotification,
} from "@/lib/db/schema";
import { computeDiff, type SyncDiff } from "@/lib/db/sync-diff";
import { pullVocab } from "@/lib/db/sync-vocab";
import { parseHistoryEntryFromServerJob } from "@/lib/parse-recipe/parse-history-entry";
import { api, routes } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { useNavigate } from "@/lib/transitions";

// Recipes written within this window are assumed to still be in-flight (the
// normalize PATCH hasn't reached the server yet), so a diff conflict during
// this period is transient and silently ignored.
const GRACE_WINDOW_MS = 90_000;

// Adopt this client's anonymous parse jobs into the account, then pull the
// user's full server-side history into Dexie so it shows across devices.
async function syncParseHistory(): Promise<void> {
  const localIds = (await db.parseHistory.toArray()).map((entry) => entry.id);
  if (localIds.length > 0) {
    await fetch(api.parseQueueClaim, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: localIds.slice(0, 200) }),
    });
  }

  const res = await fetch(api.parseQueue);
  if (!res.ok) return;
  const { jobs } = await res.json();
  const entries = (
    jobs as Parameters<typeof parseHistoryEntryFromServerJob>[0][]
  )
    .map(parseHistoryEntryFromServerJob)
    .filter((entry): entry is ParseHistoryEntry => entry !== null);
  await bulkPutParseHistory(entries);
}

async function syncPantry(): Promise<void> {
  const res = await fetch(api.pantry);
  if (!res.ok) return;
  const { items } = await res.json();
  const parsed: PantryItem[] = (items as Record<string, unknown>[]).map(
    (rawItem) => ({
      ...(rawItem as Omit<PantryItem, "addedAt">),
      addedAt: new Date(rawItem.addedAt as string),
    }),
  );
  await clearPantry();
  await bulkPutPantry(parsed);
}

async function syncIngredients(): Promise<void> {
  await pullVocab();

  const stuckProvisionals = await db.ingredients
    .filter((entry) => entry.status === INGREDIENT_STATUS.PROVISIONAL)
    .toArray();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  for (const entry of stuckProvisionals) {
    if (entry.retryCount !== undefined && entry.retryCount >= 3) continue;
    if (
      entry.lastAttemptAt !== null &&
      entry.lastAttemptAt !== undefined &&
      entry.lastAttemptAt > fiveMinAgo
    )
      continue;
    syncFetch(api.ingredientsEnrich, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, rawText: entry.en }),
    });
  }
}

function diffToNotifications<T extends Recipe | Collection>(
  diff: SyncDiff<T>,
  entityType: SyncEntityType,
): Omit<SyncNotification, "id" | "createdAt">[] {
  return [
    ...diff.serverOnly.map((item) => ({
      entityId: item.id,
      entityType,
      type: "server_only" as const,
      serverSnapshot: JSON.stringify(item),
      localSnapshot: null,
    })),
    ...diff.localOnly.map((item) => ({
      entityId: item.id,
      entityType,
      type: "local_only" as const,
      serverSnapshot: null,
      localSnapshot: JSON.stringify(item),
    })),
    ...diff.conflicted.map(({ local, server }) => ({
      entityId: local.id,
      entityType,
      type: "conflicted" as const,
      serverSnapshot: JSON.stringify(server),
      localSnapshot: JSON.stringify(local),
    })),
  ];
}

// Supabase returns createdAt/updatedAt as ISO strings; revive them to Date
// before writing to Dexie.
function parseTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  raw: unknown[],
): T[] {
  return (raw as Record<string, unknown>[]).map((row) => ({
    ...(row as Omit<T, "createdAt" | "updatedAt">),
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  })) as T[];
}

async function isMaintenanceBlocked(response: Response): Promise<boolean> {
  return (await maintenanceErrorFromResponse(response)) !== null;
}

export function useSyncOnLogin() {
  const { data: session } = authClient.useSession();
  const hasSynced = useRef(false);
  const renormalized = useRef(false);
  const shapeMigrated = useRef(false);
  const reviewedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsSignedIn(!!session);
  }, [session]);

  // One-time upgrade of older recipes to the index-aligned
  // canonicalIngredientIds format so per-ingredient pantry dots (including
  // cross-language) work. Lazy import keeps the normalize pipeline off this
  // hook's load path; self-limiting, so it's a cheap no-op once migrated.
  useEffect(() => {
    if (renormalized.current) return;
    renormalized.current = true;
    import("@/lib/db/renormalize-recipes")
      .then((module) => module.renormalizeOutdatedRecipes())
      .catch(() => {});
  }, []);

  // One-time upgrade from the legacy single-`modifier`/string-`section` recipe
  // shape to `modifiers[]` + structured `sections`/`sectionId`. Self-limiting:
  // migrateLegacyRecipeShapes() itself skips any recipe that already has a
  // `sections` array, so a repeat run (or one on a recipe with no legacy
  // fields at all) is a cheap no-op.
  useEffect(() => {
    if (shapeMigrated.current) return;
    shapeMigrated.current = true;
    import("@/lib/db/migrate-recipe-shape")
      .then((module) => module.migrateLegacyRecipeShapes())
      .catch(() => {});
  }, []);

  // One-time reconcile: clears stale duplicate vocab rows left over from the
  // pre-merge-on-enrich era, resets the delta-sync watermark, re-pulls clean
  // vocab, and re-normalizes all recipes against the surviving canonical ids.
  // Guard key "vocabReconciled_v1" ensures this runs only once per device.
  // Must be deployed after the server-side cleanup-dup-ingredients.sql script
  // has been committed, otherwise the re-pull restores the old dupes.
  useEffect(() => {
    import("@/lib/db/reconcile-vocab")
      .then((module) => module.reconcileVocab())
      .catch(() => {});
  }, []);
  const navigate = useNavigate();
  const inFlightRef = useRef<Promise<void> | null>(null);

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

      const serverRecipes = parseTimestamps<Recipe>(rawServerRecipes ?? []);
      const serverCollections = parseTimestamps<Collection>(
        rawServerCollections ?? [],
      );

      const [localRecipes, localCollections] = await Promise.all([
        db.recipes.toArray(),
        db.collections.toArray(),
      ]);

      const recipeDiff = computeDiff<Recipe>(localRecipes, serverRecipes);

      const collectionDiff = computeDiff<Collection>(
        localCollections,
        serverCollections,
      );

      const now = Date.now();
      const stableRecipeDiff: SyncDiff<Recipe> = {
        ...recipeDiff,
        conflicted: recipeDiff.conflicted.filter(
          ({ local }) => now - local.updatedAt.getTime() >= GRACE_WINDOW_MS,
        ),
      };

      const allNotifications = [
        ...diffToNotifications(stableRecipeDiff, "recipe"),
        ...diffToNotifications(collectionDiff, "collection"),
      ];

      await replaceSyncNotifications(allNotifications);

      // Only announce review items that are new since the last sync, so a
      // focus-triggered re-pull doesn't re-toast a review the user has already
      // seen (or is mid-resolving).
      const hasNewReviewItems = allNotifications.some(
        (notification) => !reviewedIds.current.has(notification.entityId),
      );
      reviewedIds.current = new Set(
        allNotifications.map((notification) => notification.entityId),
      );

      const total = allNotifications.length;
      if (total > 0 && hasNewReviewItems) {
        const locale = window.location.pathname.split("/")[1] ?? "en";
        toast.info(
          `${total} item${total !== 1 ? "s" : ""} need${total === 1 ? "s" : ""} your review`,
          {
            action: {
              label: "Review",
              onClick: () => navigate.push(routes.syncReview(locale)),
            },
          },
        );
      }
    } catch {
      toast.error("Sync failed — check your connection");
      hasSynced.current = false;
    }
  }, [session, navigate]);

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

  useEffect(() => {
    if (!session || hasSynced.current) return;
    hasSynced.current = true;
    sync();
  }, [session, sync]);

  // Re-pull when the app regains focus so recipes parsed elsewhere (e.g. the
  // Telegram bot) surface without a manual reload. The in-flight guard avoids
  // overlapping pulls; the new-items toast guard keeps repeat focus quiet.
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
