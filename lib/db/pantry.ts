import { api } from "@/lib/routes";
import { db } from "./db";
import type { PantryItem, VocabularyIngredient } from "./schema";

export async function getPantryItems(): Promise<PantryItem[]> {
  return db.pantry.toArray();
}

export async function addPantryItem(
  item: Omit<PantryItem, "id" | "addedAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  const pantryItem: PantryItem = { ...item, id, addedAt: new Date() };
  await db.pantry.add(pantryItem);

  // Include the ingredient record so the route can upsert it before the
  // pantry row — prevents FK violations when the ingredient hasn't synced
  // to Postgres yet (provisional race condition or canonical sync gap).
  let ingredientData: VocabularyIngredient | undefined;
  if (item.ingredientId) {
    ingredientData = await db.ingredients.get(item.ingredientId);
  }

  fetch(api.pantry, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...pantryItem,
      ingredientData: ingredientData ?? null,
    }),
  }).catch(() => {});
  return id;
}

export async function removePantryItem(id: string): Promise<void> {
  await db.pantry.delete(id);
  fetch(api.pantry, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch(() => {});
}

export async function togglePantryItem(id: string): Promise<void> {
  const item = await db.pantry.get(id);
  if (!item) return;
  const updated = { ...item, on: !item.on };
  await db.pantry.update(id, { on: updated.on });
  fetch(api.pantry, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updated),
  }).catch(() => {});
}

export async function setPantryQty(
  id: string,
  qty: number,
  unit: string,
): Promise<void> {
  await db.pantry.update(id, { qty, unit });
}

export async function clearPantry(): Promise<void> {
  return db.pantry.clear();
}

export async function bulkPutPantry(items: PantryItem[]): Promise<void> {
  await db.pantry.bulkPut(items);
}
