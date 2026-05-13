import { generateId } from "../utils";
import { db } from "./db";
import type { SyncNotification } from "./schema";

export async function replaceSyncNotifications(
  items: Omit<SyncNotification, "id" | "createdAt">[],
): Promise<void> {
  await db.transaction("rw", db.notifications, async () => {
    await db.notifications.clear();
    if (items.length > 0) {
      const now = new Date();
      await db.notifications.bulkAdd(
        items.map((item) => ({ ...item, id: generateId(), createdAt: now })),
      );
    }
  });
}

export async function getAllNotifications(): Promise<SyncNotification[]> {
  return db.notifications.orderBy("createdAt").reverse().toArray();
}

export async function resolveNotification(id: string): Promise<void> {
  await db.notifications.delete(id);
}

export async function clearSyncNotifications(): Promise<void> {
  await db.notifications.clear();
}

export async function getSyncNotificationCount(): Promise<number> {
  return db.notifications.count();
}
