import { db } from "@/lib/db/db";
import { bulkPutPantry, clearPantry } from "@/lib/db/pantry";
import { bulkPutParseHistory } from "@/lib/db/parse-history";
import { planReconcile, type ReconcileItem } from "@/lib/db/reconcile-plan";
import {
  INGREDIENT_STATUS,
  type PantryItem,
  type ParseHistoryEntry,
} from "@/lib/db/schema";
import { pullVocab } from "@/lib/db/sync-vocab";
import { parseHistoryEntryFromServerJob } from "@/lib/parse-recipe/parse-history-entry";
import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";

// Recipes written within this window are assumed to still be in-flight (the
// normalize PATCH hasn't reached the server yet), so a diff conflict during
// this period is transient and silently ignored.
const GRACE_WINDOW_MS = 90_000;

interface SyncStore<T> {
  bulkPut(items: T[]): Promise<unknown>;
  bulkDelete(ids: string[]): Promise<unknown>;
  update(id: string, changes: Partial<T>): Promise<unknown>;
}

// Adopt this client's anonymous parse jobs into the account, then pull the
// user's full server-side history into Dexie so it shows across devices.
export async function syncParseHistory(): Promise<void> {
  const localIds = (await db.parseHistory.toArray()).map((entry) => entry.id);
  if (localIds.length > 0) {
    await fetch(api.parseQueueClaim, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: localIds.slice(0, 200) }),
    });
  }

  const res = await fetch(api.parseQueue);
  if (!res.ok) return;
  const { jobs } = await res.json();
  const entries = (
    jobs as Parameters<typeof parseHistoryEntryFromServerJob>[0][]
  )
    .map(parseHistoryEntryFromServerJob)
    .filter((entry): entry is ParseHistoryEntry => entry !== null);
  await bulkPutParseHistory(entries);
}

export async function syncPantry(): Promise<void> {
  const res = await fetch(api.pantry);
  if (!res.ok) return;
  const { items } = await res.json();
  const parsed: PantryItem[] = (items as Record<string, unknown>[]).map(
    (rawItem) => ({
      ...(rawItem as Omit<PantryItem, "addedAt">),
      addedAt: new Date(rawItem.addedAt as string),
    }),
  );
  await clearPantry();
  await bulkPutPantry(parsed);
}

export async function syncIngredients(): Promise<void> {
  await pullVocab();

  const stuckProvisionals = await db.ingredients
    .filter((entry) => entry.status === INGREDIENT_STATUS.PROVISIONAL)
    .toArray();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  for (const entry of stuckProvisionals) {
    if (entry.retryCount !== undefined && entry.retryCount >= 3) continue;
    if (
      entry.lastAttemptAt !== null &&
      entry.lastAttemptAt !== undefined &&
      entry.lastAttemptAt > fiveMinAgo
    )
      continue;
    syncFetch(api.ingredientsEnrich, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entry.id, rawText: entry.en }),
    });
  }
}

// Apply a server-wins reconciliation for one entity type: overwrite/pull the
// server copies, delete the locally-orphaned (server-deleted) rows, and upload
// the genuinely-new device-only rows. `syncedAt` is set on every row that
// round-trips so a later device-only appearance is unambiguous (new vs.
// server-deleted). It is device-local only — the server strips it on write.
export async function applyReconcile<T extends ReconcileItem>(
  local: T[],
  server: T[],
  config: {
    table: SyncStore<T>;
    syncEndpoint: string;
    bodyKey: "recipes" | "collections";
    now: number;
  },
): Promise<void> {
  const plan = planReconcile(local, server, {
    now: config.now,
    graceWindowMs: GRACE_WINDOW_MS,
  });
  const syncedAt = new Date(config.now);

  if (plan.applyFromServer.length > 0) {
    await config.table.bulkPut(
      plan.applyFromServer.map((item) => ({ ...item, syncedAt })),
    );
  }

  if (plan.deleteLocalIds.length > 0) {
    await config.table.bulkDelete(plan.deleteLocalIds);
  }

  if (plan.pushToServer.length > 0) {
    const res = await fetch(config.syncEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [config.bodyKey]: plan.pushToServer }),
    });
    if (res.ok) {
      await Promise.all(
        plan.pushToServer.map((item) =>
          config.table.update(item.id, { syncedAt } as Partial<T>),
        ),
      );
    }
  }
}

// Supabase returns createdAt/updatedAt as ISO strings; revive them to Date
// before writing to Dexie.
export function parseTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  raw: unknown[],
): T[] {
  return (raw as Record<string, unknown>[]).map((row) => ({
    ...(row as Omit<T, "createdAt" | "updatedAt">),
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  })) as T[];
}
