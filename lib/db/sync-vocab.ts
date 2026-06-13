import { db } from "@/lib/db/db";
import { api } from "@/lib/routes";

const VOCAB_WATERMARK_KEY = "ingredientsSyncedAt";

// Pull the shared ingredient vocabulary (delta-synced via the public
// GET /api/ingredients) into Dexie. Runs for everyone — anonymous users
// included — so both Fuse and embedding matching have local vocab to work
// with. Embeddings ride along in each row. No auth required; the GET is public.
export async function pullVocab(): Promise<void> {
  const watermark = localStorage.getItem(VOCAB_WATERMARK_KEY) ?? undefined;
  const url = watermark
    ? `${api.ingredients}?since=${encodeURIComponent(watermark)}`
    : api.ingredients;
  const res = await fetch(url);
  if (!res.ok) return;
  const { ingredients: data, serverMaxUpdatedAt } = await res.json();
  if (data?.length) {
    await db.ingredients.bulkPut(data);
  }
  if (serverMaxUpdatedAt) {
    localStorage.setItem(VOCAB_WATERMARK_KEY, serverMaxUpdatedAt);
  }
}
