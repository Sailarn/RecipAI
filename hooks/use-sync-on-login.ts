"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db/db";
import { replaceSyncNotifications } from "@/lib/db/notifications";
import type { Collection, Recipe, SyncEntityType, SyncNotification } from "@/lib/db/schema";
import { computeDiff, type SyncDiff } from "@/lib/db/sync-diff";
import { api, routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

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
  return (raw as any[]).map((r) => ({
    ...r,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }));
}

function parseServerCollections(raw: unknown[]): Collection[] {
  return (raw as any[]).map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  }));
}

export function useSyncOnLogin() {
  const { data: session } = authClient.useSession();
  const localRecipes = useLiveQuery(() => db.recipes.toArray());
  const hasSynced = useRef(false);
  const navigate = useNavigate();

  const sync = useCallback(async () => {
    if (!session || localRecipes === undefined) return;

    try {
      const [recipesRes, collectionsRes] = await Promise.all([
        fetch(api.recipesSync),
        fetch(api.collections),
      ]);

      const { recipes: rawServerRecipes } = await recipesRes.json();
      const { collections: rawServerCollections } = await collectionsRes.json();

      const serverRecipes = parseServerRecipes(rawServerRecipes ?? []);
      const serverCollections = parseServerCollections(rawServerCollections ?? []);

      const [localRecipesFull, localCollections] = await Promise.all([
        db.recipes.toArray(),
        db.collections.toArray(),
      ]);

      const recipeDiff = computeDiff<Recipe>(localRecipesFull, serverRecipes);
      const collectionDiff = computeDiff<Collection>(localCollections, serverCollections);

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
  }, [session, localRecipes, navigate]);

  useEffect(() => {
    if (!session || localRecipes === undefined || hasSynced.current) return;
    hasSynced.current = true;
    sync();
  }, [session, localRecipes, sync]);

  const triggerSync = useCallback(async () => {
    hasSynced.current = false;
    await sync();
    hasSynced.current = true;
  }, [sync]);

  return { triggerSync };
}
