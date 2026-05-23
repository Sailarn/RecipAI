import Fuse from "fuse.js";
import { db } from "@/lib/db/db";
import { syncUpdate } from "@/lib/db/supabase-sync";
import { api } from "@/lib/routes";
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
    .filter((v) => !v.status || v.status === "confirmed")
    .toArray();
  if (fuseCache && fuseCache.size === vocab.length) return fuseCache.index;
  const items = vocab.flatMap((v) => [
    { id: v.id, text: v.en },
    ...(v.ua ? [{ id: v.id, text: v.ua }] : []),
    ...v.aliasesEn.map((a) => ({ id: v.id, text: a })),
    ...v.aliasesUa.map((a) => ({ id: v.id, text: a })),
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
    .map((t) => t.replace(/[.,]/g, ""))
    .filter((t) => t.length > 3);
  for (const token of tokens) {
    const r = fuse.search(token);
    if (r.length > 0 && r[0].item.text.trim().split(/\s+/).length <= 2) {
      return r[0].item.id;
    }
  }

  return null;
}

async function createProvisional(
  en: string,
  ua?: string | null,
  category?: string | null,
): Promise<string | null> {
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
      status: "provisional",
      retryCount: 0,
      lastAttemptAt: null,
    });
    // Background server sync — 401 is expected when unauthenticated
    fetch(api.ingredients, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, en, ua, category }),
    }).catch(() => {});
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
    if (NULL_PATTERNS.some((p) => p.test(ing.item.trim()))) {
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
        queryEmbs = await getIngredientEmbeddings(pending.map((p) => p.item));
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

  await db.recipes.update(recipeId, {
    canonicalIngredientIds: finalIds,
    unrecognizedIngredients,
  });
  syncUpdate(recipeId, {
    canonicalIngredientIds: finalIds,
    unrecognizedIngredients,
  });
}
