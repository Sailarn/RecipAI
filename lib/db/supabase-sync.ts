import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import type { Recipe } from "./schema";
import { createSyncQueue } from "./sync-queue";

const sendInOrder = createSyncQueue();

export function syncCreate(recipe: Recipe): void {
  sendInOrder(recipe.id, () =>
    syncFetch(api.recipes, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipe),
    }),
  );
}

export function syncUpdate(id: string, updates: Partial<Recipe>): void {
  sendInOrder(id, () =>
    syncFetch(api.recipe(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }),
  );
}

export function syncDelete(id: string): void {
  sendInOrder(id, () => syncFetch(api.recipe(id), { method: "DELETE" }));
}
