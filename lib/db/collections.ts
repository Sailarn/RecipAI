import type { Collection } from "./schema";
import { db } from "./db";
import {
  syncCreateCollection,
  syncDeleteCollection,
} from "./supabase-sync-collections";

export async function createCollection(
  data: Pick<Collection, "name" | "emoji">,
): Promise<string> {
  const now = new Date();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: data.name,
    emoji: data.emoji,
    createdAt: now,
    updatedAt: now,
  };
  await db.collections.add(collection);
  syncCreateCollection(collection);
  return collection.id;
}

export async function getAllCollections(): Promise<Collection[]> {
  return db.collections.toArray();
}

export async function deleteCollection(id: string): Promise<void> {
  await db.collections.delete(id);
  syncDeleteCollection(id);
}
