import { generateId } from "../utils";
import { db } from "./db";
import type { Collection } from "./schema";
import {
  syncCreateCollection,
  syncDeleteCollection,
  syncUpdateCollection,
} from "./supabase-sync-collections";

export async function createCollection(
  data: Pick<Collection, "name" | "emoji">,
): Promise<string> {
  const now = new Date();
  const collection: Collection = {
    id: generateId(),
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

export async function renameCollection(
  id: string,
  name: string,
  emoji: string,
): Promise<void> {
  const now = new Date();
  await db.collections.update(id, { name, emoji, updatedAt: now });
  syncUpdateCollection(id, { name, emoji });
}

export async function deleteCollection(id: string): Promise<void> {
  await db.collections.delete(id);
  syncDeleteCollection(id);
}
