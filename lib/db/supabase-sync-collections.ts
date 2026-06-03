import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import type { Collection } from "./schema";

export function syncCreateCollection(
  collection: Collection & { userId?: string },
): void {
  syncFetch(api.collections, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: collection.name,
      emoji: collection.emoji,
      id: collection.id,
    }),
  });
}

export function syncUpdateCollection(
  id: string,
  data: { name: string; emoji: string },
): void {
  syncFetch(api.collection(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function syncDeleteCollection(id: string): void {
  syncFetch(api.collection(id), { method: "DELETE" });
}
