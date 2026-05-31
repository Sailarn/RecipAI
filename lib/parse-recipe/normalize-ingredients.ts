import Fuse from "fuse.js";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { syncUpdate } from "@/lib/db/supabase-sync";
import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { getIngredientEmbeddings } from "./embed-client";
import { enrichIngredient } from "./enrich-ingredient";

const SIMILARITY_THRESHOLD = 0.82;
const SIMILARITY_GAP = 0.08;
const FUSE_THRESHOLD = 0.2;
const NULL_PATTERNS = [
  /^за смаком$/i,
  /^за бажанням$/i,
  /^to taste$/i,
  /^as needed$/i,
  /^optional$/i,
  /^for garnish$/i,
  /^for serving$/i,
];

let fuseCache: {
  index: Fuse<{ id: string; text: string }>;
  size: number;
} | null = null;

async function getFuseIndex(): Promise<Fuse<{ id: string; text: string }>> {
  const vocab = await db.ingredients
    .filter(
      (ingredient) =>
        !ingredient.status || ingredient.status === INGREDIENT_STATUS.CONFIRMED,
    )
    .toArray();
  if (fuseCache && fuseCache.size === vocab.length) return fuseCache.index;
  const items = vocab.flatMap((vocabEntry) => [
    { id: vocabEntry.id, text: vocabEntry.en },
    ...(vocabEntry.ua ? [{ id: vocabEntry.id, text: vocabEntry.ua }] : []),
    ...vocabEntry.aliasesEn.map((alias) => ({
      id: vocabEntry.id,
      text: alias,
    })),
    ...vocabEntry.aliasesUa.map((alias) => ({
      id: vocabEntry.id,
      text: alias,
    })),
  ]);
  const index = new Fuse(items, {
    keys: ["text"],
    threshold: FUSE_THRESHOLD,
    includeScore: true,
  });
  fuseCache = { index, size: vocab.length };
  return index;
}

type VocabEmbedding = { id: string; embedding: number[] };
let embeddingCache: VocabEmbedding[] | null = null;

async function getVocabEmbeddings(): Promise<VocabEmbedding[] | null> {
  if (embeddingCache) return embeddingCache;
  try {
    const res = await fetch("/vocab-embeddings.json");
    if (!res.ok) return null;
    embeddingCache = (await res.json()) as VocabEmbedding[];
    return embeddingCache;
  } catch {
    return null;
  }
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function preprocessIngredient(text: string): string {
  return text
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fuseHit(
  fuse: Fuse<{ id: string; text: string }>,
  text: string,
): string | null {
  const preprocessed = preprocessIngredient(text);

  // Try the full preprocessed text first
  const full = fuse.search(preprocessed);
  if (full.length > 0) return full[0].item.id;

  // Fall back to individual token search — handles multi-word phrases like
  // "кетчупу Торчин для дітей" → token "кетчупу" → ketchup.
  // Guard: only accept when the matched alias is ≤ 2 words, so a common word
  // like "власному" doesn't hit a long alias phrase.
  const tokens = preprocessed
    .split(/\s+/)
    .map((token) => token.replace(/[.,]/g, ""))
    .filter((token) => token.length > 3);
  for (const token of tokens) {
    const fuseResults = fuse.search(token);
    if (
      fuseResults.length > 0 &&
      fuseResults[0].item.text.trim().split(/\s+/).length <= 2
    ) {
      return fuseResults[0].item.id;
    }
  }

  return null;
}

async function createProvisional(
  en: string,
  ua?: string | null,
  category?: string | null,
): Promise<string | null> {
  // Reuse any existing entry with the same raw text to avoid duplicate provisionals
  const lc = en.toLowerCase();
  const existing = await db.ingredients
    .filter((vocabEntry) => vocabEntry.en.toLowerCase() === lc)
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
): Promise<void> {
  const fuse = await getFuseIndex();

  type Pending = { item: string; ua?: string | null; category?: string | null };

  const canonicalIngredientIds: string[] = [];
  const unrecognizedIngredients: string[] = [];
  const pending: Pending[] = [];
  const pendingSlots: number[] = [];

  for (const ing of ingredients) {
    if (NULL_PATTERNS.some((pattern) => pattern.test(ing.item.trim()))) {
      unrecognizedIngredients.push(ing.item);
      continue;
    }

    const hit =
      fuseHit(fuse, ing.item) ?? (ing.ua ? fuseHit(fuse, ing.ua) : null);
    if (hit) {
      canonicalIngredientIds.push(hit);
      continue;
    }

    pendingSlots.push(canonicalIngredientIds.length);
    canonicalIngredientIds.push("");
    pending.push(ing);
  }

  if (pending.length > 0) {
    const vocabEmbs = await getVocabEmbeddings();
    let queryEmbs: number[][] | null = null;

    if (vocabEmbs) {
      try {
        queryEmbs = await getIngredientEmbeddings(
          pending.map((pendingItem) => pendingItem.item),
        );
      } catch (err) {
        if (!(err instanceof Error && err.message === "EmbedConsentRequired")) {
          console.error("[normalize] embedding error:", err);
        }
        queryEmbs = null;
      }
    }

    for (let i = 0; i < pending.length; i++) {
      const ing = pending[i];
      let matchedId: string | null = null;

      if (queryEmbs && vocabEmbs) {
        const qEmb = queryEmbs[i];
        let best = 0;
        let second = 0;
        let bestId = "";
        for (const ve of vocabEmbs) {
          const sim = cosineSim(qEmb, ve.embedding);
          if (sim > best) {
            second = best;
            best = sim;
            bestId = ve.id;
          } else if (sim > second) {
            second = sim;
          }
        }
        if (best >= SIMILARITY_THRESHOLD && best - second >= SIMILARITY_GAP) {
          matchedId = bestId;
        }
      }

      if (!matchedId) {
        matchedId = await createProvisional(ing.item, ing.ua, ing.category);
        if (matchedId) {
          enrichIngredient(matchedId, ing.item, ing.ua, ing.category).catch(
            () => {},
          );
        }
      }

      if (matchedId) {
        canonicalIngredientIds[pendingSlots[i]] = matchedId;
      }
    }
  }

  const finalIds = canonicalIngredientIds.filter(Boolean);
  const updatedAt = new Date();

  await db.recipes.update(recipeId, {
    canonicalIngredientIds: finalIds,
    unrecognizedIngredients,
    updatedAt,
  });
  syncUpdate(recipeId, {
    canonicalIngredientIds: finalIds,
    unrecognizedIngredients,
    updatedAt,
  });
}
