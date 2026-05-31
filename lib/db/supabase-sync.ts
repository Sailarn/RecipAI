import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import type { Recipe } from "./schema";

export function syncCreate(recipe: Recipe): void {
  syncFetch(api.recipes, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  });
}

export function syncUpdate(id: string, updates: Partial<Recipe>): void {
  syncFetch(api.recipe(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
}

export function syncDelete(id: string): void {
  syncFetch(api.recipe(id), { method: "DELETE" });
}
