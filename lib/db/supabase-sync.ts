import { api } from "@/lib/routes";
import type { Recipe } from "./schema";

export function syncCreate(recipe: Recipe): void {
  fetch(api.recipes, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  }).catch(() => {});
}

export function syncUpdate(id: string, updates: Partial<Recipe>): void {
  fetch(api.recipe(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export function syncDelete(id: string): void {
  fetch(api.recipe(id), {
    method: "DELETE",
  }).catch(() => {});
}
