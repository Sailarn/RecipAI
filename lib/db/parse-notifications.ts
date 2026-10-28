import { db } from "./db";
import type { ParseNotification } from "./schema";

// put = upsert by id (the parse job id), so announcing a job twice is one row.
export async function addParseNotification(
  notification: ParseNotification,
): Promise<void> {
  await db.parseNotifications.put(notification);
}

export async function dismissParseNotification(id: string): Promise<void> {
  await db.parseNotifications.delete(id);
}
