import { db } from "@/lib/db/db";
import { api } from "@/lib/routes";

const VOCAB_WATERMARK_KEY = "ingredientsSyncedAt";
const VOCAB_VERSION_KEY = "ingredientsSyncedVersion";

// Re-fetch a small window before the stored watermark on every delta pull.
// `updated_at` is a timezone-naive Postgres timestamp, so the watermark
// round-trip (Date -> toISOString -> gt) can drift by sub-second precision and
// skip a boundary row, which then stays stale locally forever. Overlapping the
// window guarantees the boundary is re-fetched; bulkPut is an idempotent upsert
// so re-pulling those rows is harmless.
const WATERMARK_OVERLAP_MS = 60_000;

function deltaSince(): string | undefined {
  const watermark = localStorage.getItem(VOCAB_WATERMARK_KEY);
  if (!watermark) return undefined;
  const overlapped = new Date(watermark).getTime() - WATERMARK_OVERLAP_MS;
  if (Number.isNaN(overlapped)) return undefined;
  return new Date(overlapped).toISOString();
}

// Pull the shared ingredient vocabulary (delta-synced via the public
// GET /api/ingredients) into Dexie. Runs for everyone — anonymous users
// included — so the client Fuse text-match has local names/aliases to work
// with. Vectors are not synced; embedding matching runs server-side via
// /api/ingredients/embed-match. No auth required; the GET is public.
//
// A new app release forces a full re-pull (the watermark is ignored): this
// heals any vocab row that went stale under a previous build — e.g. a missed
// translation left by a watermark skip — without needing a manual reset.
// Startup can ask for the vocab from several places at once (the vocab-sync
// hook, the login sync, the reconcile), and after a release each of those is a
// full download. Calls for the same URL share one request. A different URL is
// never joined: reconcile's full re-pull must not settle for a delta pull that
// was already in flight when it cleared the table.
const inFlightPulls = new Map<string, Promise<void>>();

export async function pullVocab(): Promise<void> {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
  const isNewVersion = localStorage.getItem(VOCAB_VERSION_KEY) !== appVersion;

  const since = isNewVersion ? undefined : deltaSince();
  const url = since
    ? `${api.ingredients}?since=${encodeURIComponent(since)}`
    : api.ingredients;

  const existing = inFlightPulls.get(url);
  if (existing) return existing;
  const pull = fetchVocab(url, appVersion).finally(() => {
    inFlightPulls.delete(url);
  });
  inFlightPulls.set(url, pull);
  return pull;
}

async function fetchVocab(url: string, appVersion: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) return;
  const { ingredients: data, serverMaxUpdatedAt } = await res.json();
  if (data?.length) {
    await db.ingredients.bulkPut(data);
  }
  if (serverMaxUpdatedAt) {
    localStorage.setItem(VOCAB_WATERMARK_KEY, serverMaxUpdatedAt);
  }
  localStorage.setItem(VOCAB_VERSION_KEY, appVersion);
}
