import { db } from "./db";
import type { PantryItem } from "./schema";

export async function getPantryItems(): Promise<PantryItem[]> {
  return db.pantry.toArray();
}

export async function addPantryItem(
  item: Omit<PantryItem, "id" | "addedAt">,
): Promise<string> {
  const id = crypto.randomUUID();
  return db.pantry.add({ ...item, id, addedAt: new Date() }) as Promise<string>;
}

export async function removePantryItem(id: string): Promise<void> {
  return db.pantry.delete(id);
}

export async function togglePantryItem(id: string): Promise<void> {
  const item = await db.pantry.get(id);
  if (!item) return;
  await db.pantry.update(id, { on: !item.on });
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
