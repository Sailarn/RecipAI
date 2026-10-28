import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { createBarrier } from "./create-barrier";
import type { Recipe } from "./schema";

const barrier = createBarrier();

export function syncCreate(recipe: Recipe): void {
  barrier.trackCreate(
    recipe.id,
    syncFetch(api.recipes, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipe),
    }),
  );
}

export function syncUpdate(id: string, updates: Partial<Recipe>): void {
  barrier.afterCreate(id, () =>
    syncFetch(api.recipe(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }),
  );
}

export function syncDelete(id: string): void {
  barrier.afterCreate(id, () =>
    syncFetch(api.recipe(id), { method: "DELETE" }),
  );
}
