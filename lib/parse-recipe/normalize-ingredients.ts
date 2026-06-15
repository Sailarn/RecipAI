import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { syncUpdate } from "@/lib/db/supabase-sync";
import { logger } from "@/lib/logger";
import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { getIngredientEmbeddings } from "./embed-client";
import { enrichIngredient } from "./enrich-ingredient";
import { matchVocabId } from "./vocab-match";

const SIMILARITY_THRESHOLD = 0.82;
const SIMILARITY_GAP = 0.08;
const NULL_PATTERNS = [
  /^за смаком$/i,
  /^за бажанням$/i,
  /^to taste$/i,
  /^as needed$/i,
  /^optional$/i,
  /^for garnish$/i,
  /^for serving$/i,
];

type VocabEmbedding = { id: string; embedding: number[] };
let embeddingCache: { list: VocabEmbedding[]; size: number } | null = null;

// Vocab embeddings now live on the Dexie ingredient rows (delta-synced from
// the server), not in a static file. Read confirmed entries that carry an
// embedding and cache them, keyed by count like the Fuse index above.
async function getVocabEmbeddings(): Promise<VocabEmbedding[]> {
  const vocab = await db.ingredients
    .filter(
      (ingredient) =>
        !ingredient.status || ingredient.status === INGREDIENT_STATUS.CONFIRMED,
    )
    .toArray();
  const withEmbedding = vocab.filter(
    (ingredient) =>
      Array.isArray(ingredient.embedding) && ingredient.embedding.length > 0,
  );
  if (embeddingCache && embeddingCache.size === withEmbedding.length)
    return embeddingCache.list;
  const list = withEmbedding.map((ingredient) => ({
    id: ingredient.id,
    embedding: ingredient.embedding as number[],
  }));
  embeddingCache = { list, size: withEmbedding.length };
  return list;
}

// Embeddings are L2-normalized, so the dot product equals cosine similarity.
function cosineSim(vectorA: number[], vectorB: number[]): number {
  let dot = 0;
  for (let i = 0; i < vectorA.length; i++) dot += vectorA[i] * vectorB[i];
  return dot;
}

// Pick the closest vocab entry to a query embedding, but only when the top
// match is both strong enough and clearly ahead of the runner-up — otherwise
// return null so the caller falls back to creating a provisional ingredient.
function findBestEmbeddingMatch(
  queryEmbedding: number[],
  vocabEmbeddings: VocabEmbedding[],
): string | null {
  let best = 0;
  let second = 0;
  let bestId = "";
  for (const vocabEmbedding of vocabEmbeddings) {
    const sim = cosineSim(queryEmbedding, vocabEmbedding.embedding);
    if (sim > best) {
      second = best;
      best = sim;
      bestId = vocabEmbedding.id;
    } else if (sim > second) {
      second = sim;
    }
  }
  if (best >= SIMILARITY_THRESHOLD && best - second >= SIMILARITY_GAP) {
    return bestId;
  }
  return null;
}

async function createProvisional(
  en: string,
  ua?: string | null,
  category?: string | null,
): Promise<string | null> {
  // Reuse any existing entry with the same raw text to avoid duplicate provisionals
  const lowerEn = en.toLowerCase();
  const existing = await db.ingredients
    .filter((vocabEntry) => vocabEntry.en.toLowerCase() === lowerEn)
    .first();
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  try {
    // Write locally first — works regardless of auth state
    await db.ingredients.put({
      id,
      en,
      ua: ua ?? null,
      category: category ?? "other",
      aliasesEn: [],
      aliasesUa: [],
      status: INGREDIENT_STATUS.PROVISIONAL,
      retryCount: 0,
      lastAttemptAt: null,
    });
    syncFetch(api.ingredients, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, en, ua, category }),
    });
    return id;
  } catch {
    return null;
  }
}

export async function normalizeRecipeIngredients(
  recipeId: string,
  ingredients: Array<{
    item: string;
    ua?: string | null;
    category?: string | null;
  }>,
): Promise<{ matched: number; total: number }> {
  type Pending = { item: string; ua?: string | null; category?: string | null };

  const canonicalIngredientIds: string[] = [];
  const unrecognizedIngredients: string[] = [];
  const pending: Pending[] = [];
  const pendingSlots: number[] = [];

  for (const ingredient of ingredients) {
    if (NULL_PATTERNS.some((pattern) => pattern.test(ingredient.item.trim()))) {
      unrecognizedIngredients.push(ingredient.item);
      // Keep a slot so canonicalIngredientIds stays index-aligned with
      // ingredients — per-ingredient consumers (the stock dot) rely on it.
      canonicalIngredientIds.push("");
      continue;
    }

    const hit = await matchVocabId(ingredient.item, ingredient.ua);
    if (hit) {
      canonicalIngredientIds.push(hit);
      continue;
    }

    pendingSlots.push(canonicalIngredientIds.length);
    canonicalIngredientIds.push("");
    pending.push(ingredient);
  }

  if (pending.length > 0) {
    const vocabEmbs = await getVocabEmbeddings();
    let queryEmbs: number[][] | null = null;

    if (vocabEmbs.length > 0) {
      try {
        queryEmbs = await getIngredientEmbeddings(
          pending.map((pendingItem) => pendingItem.item),
        );
      } catch (caughtError) {
        if (
          !(
            caughtError instanceof Error &&
            caughtError.message === "EmbedConsentRequired"
          )
        ) {
          logger.error("[normalize] embedding error:", caughtError);
        }
        queryEmbs = null;
      }
    }

    for (let i = 0; i < pending.length; i++) {
      const pendingItem = pending[i];
      let matchedId: string | null = null;

      if (queryEmbs && vocabEmbs.length > 0) {
        matchedId = findBestEmbeddingMatch(queryEmbs[i], vocabEmbs);
      }

      if (!matchedId) {
        matchedId = await createProvisional(
          pendingItem.item,
          pendingItem.ua,
          pendingItem.category,
        );
        if (matchedId) {
          enrichIngredient(
            matchedId,
            pendingItem.item,
            pendingItem.ua,
            pendingItem.category,
          ).catch(() => {});
        }
      }

      if (matchedId) {
        canonicalIngredientIds[pendingSlots[i]] = matchedId;
      }
    }
  }

  // Store the array index-aligned with ingredients ("" where there's no
  // canonical match). Set-style consumers (the recipe-card matcher) filter the
  // empties; per-ingredient consumers (the stock dot) read by index.
  const matchedCount = canonicalIngredientIds.filter(Boolean).length;
  const updatedAt = new Date();

  await db.recipes.update(recipeId, {
    canonicalIngredientIds,
    unrecognizedIngredients,
    updatedAt,
  });
  syncUpdate(recipeId, {
    canonicalIngredientIds,
    unrecognizedIngredients,
    updatedAt,
  });

  return { matched: matchedCount, total: ingredients.length };
}
