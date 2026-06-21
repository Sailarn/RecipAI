import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { generateId } from "@/lib/utils";
import { db } from "./db";
import type { PantryItem, VocabularyIngredient } from "./schema";

export async function getPantryItems(): Promise<PantryItem[]> {
  return db.pantry.toArray();
}

// Sync a pantry row to the server. Includes the ingredient record so the route
// can upsert it before the pantry row — prevents FK violations when the
// ingredient hasn't synced to Postgres yet (provisional race condition or
// canonical sync gap).
async function syncPantryUpsert(item: PantryItem): Promise<void> {
  let ingredientData: VocabularyIngredient | undefined;
  if (item.ingredientId) {
    ingredientData = await db.ingredients.get(item.ingredientId);
  }

  syncFetch(api.pantry, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...item,
      ingredientData: ingredientData ?? null,
    }),
  });
}

export async function addPantryItem(
  input: Omit<PantryItem, "id" | "addedAt" | "qty" | "unit" | "cat"> & {
    qty?: number;
    unit?: string;
    cat?: string;
  },
): Promise<string> {
  const item: Omit<PantryItem, "id" | "addedAt"> = {
    ...input,
    qty: input.qty ?? 1,
    unit: input.unit ?? "pcs",
    cat: input.cat ?? "Other",
  };

  // One row per (user, ingredient): if this ingredient is already in the
  // pantry, update that row in place rather than inserting a duplicate. Items
  // without an ingredientId (free text) are always added fresh.
  if (item.ingredientId) {
    const existing = await db.pantry
      .where("ingredientId")
      .equals(item.ingredientId)
      .first();
    if (existing) {
      const merged: PantryItem = { ...existing, ...item, id: existing.id };
      await db.pantry.put(merged);
      await syncPantryUpsert(merged);
      return existing.id;
    }
  }

  const id = generateId();
  const pantryItem: PantryItem = { ...item, id, addedAt: new Date() };
  await db.pantry.add(pantryItem);
  await syncPantryUpsert(pantryItem);
  return id;
}

export async function removePantryItem(id: string): Promise<void> {
  await db.pantry.delete(id);
  syncFetch(api.pantry, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function togglePantryItem(id: string): Promise<void> {
  const item = await db.pantry.get(id);
  if (!item) return;
  const updated = { ...item, on: !item.on };
  await db.pantry.update(id, { on: updated.on });
  await syncPantryUpsert(updated);
}

export async function clearPantry(): Promise<void> {
  return db.pantry.clear();
}

export async function bulkPutPantry(items: PantryItem[]): Promise<void> {
  await db.pantry.bulkPut(items);
}
