import { api } from "@/lib/routes";
import type { Recipe } from "./schema";

const SYNC_KEY = "recipai_synced";

function isSynced(): boolean {
  // checked against session — but we don't have session here
  return !!localStorage.getItem(SYNC_KEY);
}

export function syncCreate(recipe: Recipe): void {
  fetch(api.recipes, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  }).catch(() => {});
}

export function syncUpdate(id: string, updates: Partial<Recipe>): void {
  if (!isSynced()) return;
  fetch(api.recipe(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).catch(() => {});
}

export function syncDelete(id: string): void {
  if (!isSynced()) return;
  fetch(api.recipe(id), {
    method: "DELETE",
  }).catch(() => {});
}

export function setSyncedUser(userId: string): void {
  localStorage.setItem(SYNC_KEY, userId);
}
