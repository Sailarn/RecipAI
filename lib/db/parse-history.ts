import { db } from "./db";
import type { ParseHistoryEntry } from "./schema";

// Cap local history so it can't grow unbounded; oldest rows are pruned.
const MAX_HISTORY_ENTRIES = 100;

export async function recordParseHistory(
  entry: ParseHistoryEntry,
): Promise<void> {
  // put = upsert by id (the parse job id), so re-recording a job is idempotent.
  await db.parseHistory.put(entry);

  const total = await db.parseHistory.count();
  if (total > MAX_HISTORY_ENTRIES) {
    const stale = await db.parseHistory
      .orderBy("createdAt")
      .limit(total - MAX_HISTORY_ENTRIES)
      .primaryKeys();
    await db.parseHistory.bulkDelete(stale);
  }
}

export async function getParseHistory(): Promise<ParseHistoryEntry[]> {
  return db.parseHistory.orderBy("createdAt").reverse().toArray();
}

export async function clearParseHistory(): Promise<void> {
  await db.parseHistory.clear();
}
