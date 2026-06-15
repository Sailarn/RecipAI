import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import type { Recipe } from "./schema";

// In-flight create POSTs, keyed by recipe id. A recipe's PATCH/DELETE waits for
// its own create to land first — otherwise a fire-and-forget PATCH (e.g. the
// post-save ingredient normalize) can race ahead of the POST, get dropped on a
// not-yet-existing row, and leave the server at a stale updatedAt. That drift
// is what surfaced as a false "server has a newer version" sync prompt.
const pendingCreates = new Map<string, Promise<void>>();

export function syncCreate(recipe: Recipe): void {
  const done = syncFetch(api.recipes, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  });
  pendingCreates.set(recipe.id, done);
  done.finally(() => {
    if (pendingCreates.get(recipe.id) === done)
      pendingCreates.delete(recipe.id);
  });
}

function afterCreate(id: string, send: () => void): void {
  const pending = pendingCreates.get(id);
  if (pending) pending.then(send);
  else send();
}

export function syncUpdate(id: string, updates: Partial<Recipe>): void {
  afterCreate(id, () =>
    syncFetch(api.recipe(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }),
  );
}

export function syncDelete(id: string): void {
  afterCreate(id, () => syncFetch(api.recipe(id), { method: "DELETE" }));
}
