"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db/db";
import { api } from "@/lib/routes";

const SYNC_KEY = "recipai_synced";

export function useSyncOnLogin() {
  const { data: session } = authClient.useSession();
  const localRecipes = useLiveQuery(() => db.recipes.toArray());
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!session || !localRecipes || hasSynced.current) return;
    if (localStorage.getItem(SYNC_KEY) === session.user.id) return;

    hasSynced.current = true;

    const sync = async () => {
      if (localRecipes.length === 0) {
        const res = await fetch(api.recipesSync);
        const { recipes: remote } = await res.json();
        if (remote?.length) {
          await db.recipes.bulkPut(remote);
        }
        localStorage.setItem(SYNC_KEY, session.user.id);
        return;
      }

      const toastId = toast.loading("Syncing your recipes...");
      try {
        const res = await fetch(api.recipesSync, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipes: localRecipes }),
        });
        const { synced } = await res.json();
        localStorage.setItem(SYNC_KEY, session.user.id);
        toast.success(`${synced} recipe${synced !== 1 ? "s" : ""} synced`, {
          id: toastId,
        });
      } catch {
        toast.error("Sync failed, will retry next time", { id: toastId });
        hasSynced.current = false;
      }
    };

    sync();
  }, [session, localRecipes]);
}
