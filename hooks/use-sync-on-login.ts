"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db/db";
import type { Collection, Recipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";

export function useSyncOnLogin() {
  const { data: session } = authClient.useSession();
  const localRecipes = useLiveQuery(() => db.recipes.toArray());
  const hasSynced = useRef(false);

  const sync = useCallback(async () => {
    if (!session || localRecipes === undefined) return;

    try {
      if (localRecipes.length > 0) {
        const pushRes = await fetch(api.recipesSync, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipes: localRecipes }),
        });
        const { synced } = await pushRes.json();
        if (synced > 0) {
          toast.success(`${synced} recipe${synced !== 1 ? "s" : ""} synced`);
        }
      }

      const pullRes = await fetch(api.recipesSync);
      const { recipes: remote } = await pullRes.json();
      if (remote?.length) {
        await db.recipes.bulkPut(
          remote.map((r: Recipe) => ({
            ...r,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          })),
        );
      }

      // Fetch and store collections
      const colRes = await fetch(api.collections);
      if (colRes.ok) {
        const { collections: serverCollections } = await colRes.json();
        await db.collections.clear();
        if (serverCollections.length > 0) {
          await db.collections.bulkPut(
            serverCollections.map((c: Collection) => ({
              ...c,
              createdAt: new Date(c.createdAt),
              updatedAt: new Date(c.updatedAt),
            })),
          );
        }
      }
    } catch {
      toast.error("Sync failed, will retry next time");
      hasSynced.current = false;
    }
  }, [session, localRecipes]);

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
