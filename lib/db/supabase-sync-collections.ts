import { api } from "@/lib/routes";
import type { Collection } from "./schema";

export function syncCreateCollection(
  collection: Collection & { userId?: string },
): void {
  fetch(api.collections, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: collection.name,
      emoji: collection.emoji,
      id: collection.id,
    }),
  }).catch(() => {});
}

export function syncUpdateCollection(
  id: string,
  data: { name: string; emoji: string },
): void {
  fetch(api.collection(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export function syncDeleteCollection(id: string): void {
  fetch(api.collection(id), {
    method: "DELETE",
  }).catch(() => {});
}
