"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db/db";
import { replaceSyncNotifications } from "@/lib/db/notifications";
import { bulkPutPantry, clearPantry } from "@/lib/db/pantry";
import {
  type Collection,
  INGREDIENT_STATUS,
  type PantryItem,
  type Recipe,
  type SyncEntityType,
  type SyncNotification,
} from "@/lib/db/schema";
import { computeDiff, type SyncDiff } from "@/lib/db/sync-diff";
import { api, routes } from "@/lib/routes";
import { setIsSignedIn } from "@/lib/session-state";
import { syncFetch } from "@/lib/sync-fetch";
import { useNavigate } from "@/lib/transitions";

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
  const watermark = localStorage.getItem("ingredientsSyncedAt") ?? undefined;
  const url = watermark
    ? `${api.ingredients}?since=${encodeURIComponent(watermark)}`
    : api.ingredients;
  const res = await fetch(url);
  if (!res.ok) return;
  const { ingredients: data, serverMaxUpdatedAt } = await res.json();
  if (data?.length) {
    await db.ingredients.bulkPut(data);
  }
  if (serverMaxUpdatedAt) {
    localStorage.setItem("ingredientsSyncedAt", serverMaxUpdatedAt);
  }

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

function parseServerRecipes(raw: unknown[]): Recipe[] {
  return (raw as Record<string, unknown>[]).map((rawRecipe) => ({
    ...(rawRecipe as Omit<Recipe, "createdAt" | "updatedAt">),
    createdAt: new Date(rawRecipe.createdAt as string),
    updatedAt: new Date(rawRecipe.updatedAt as string),
  }));
}

function parseServerCollections(raw: unknown[]): Collection[] {
  return (raw as Record<string, unknown>[]).map((rawCollection) => ({
    ...(rawCollection as Omit<Collection, "createdAt" | "updatedAt">),
    createdAt: new Date(rawCollection.createdAt as string),
    updatedAt: new Date(rawCollection.updatedAt as string),
  }));
}

export function useSyncOnLogin() {
  const { data: session } = authClient.useSession();
  const hasSynced = useRef(false);

  useEffect(() => {
    setIsSignedIn(!!session);
  }, [session]);
  const navigate = useNavigate();

  const sync = useCallback(async () => {
    if (!session) return;

    syncIngredients().catch(() => {});
    syncPantry().catch(() => {});

    try {
      const [recipesRes, collectionsRes] = await Promise.all([
        fetch(api.recipesSync),
        fetch(api.collections),
      ]);

      const { recipes: rawServerRecipes } = await recipesRes.json();
      const { collections: rawServerCollections } = await collectionsRes.json();

      const serverRecipes = parseServerRecipes(rawServerRecipes ?? []);
      const serverCollections = parseServerCollections(
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

      const allNotifications = [
        ...diffToNotifications(recipeDiff, "recipe"),
        ...diffToNotifications(collectionDiff, "collection"),
      ];

      await replaceSyncNotifications(allNotifications);

      const total = allNotifications.length;
      if (total > 0) {
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

  useEffect(() => {
    if (!session || hasSynced.current) return;
    hasSynced.current = true;
    sync();
  }, [session, sync]);

  const triggerSync = useCallback(async () => {
    hasSynced.current = false;
    await sync();
    hasSynced.current = true;
  }, [sync]);

  return { triggerSync };
}
