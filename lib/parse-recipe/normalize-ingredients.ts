import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { syncUpdate } from "@/lib/db/supabase-sync";
import { logger } from "@/lib/logger";
import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { trackEvent } from "@/lib/telemetry";
import { generateId } from "@/lib/utils";
import { enrichIngredient } from "./enrich-ingredient";
import { matchVocabId } from "./vocab-match";

const NULL_PATTERNS = [
  /^за смаком$/i,
  /^за бажанням$/i,
  /^to taste$/i,
  /^as needed$/i,
  /^optional$/i,
  /^for garnish$/i,
  /^for serving$/i,
];

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

  const id = generateId();
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

// Guards against two overlapping normalize passes for the same recipe — e.g.
// the deep-link owner-pull and the post-sync sweep both catching a freshly
// pulled bot recipe. A concurrent second run could create duplicate provisional
// vocab rows, so it no-ops until the first finishes.
const normalizingRecipeIds = new Set<string>();

export async function normalizeRecipeIngredients(
  recipeId: string,
  ingredients: Array<{
    item: string;
    ua?: string | null;
    en?: string | null;
    category?: string | null;
  }>,
): Promise<{ matched: number; total: number }> {
  if (normalizingRecipeIds.has(recipeId)) {
    return { matched: 0, total: ingredients.length };
  }
  normalizingRecipeIds.add(recipeId);
  try {
    return await runNormalize(recipeId, ingredients);
  } finally {
    normalizingRecipeIds.delete(recipeId);
  }
}

async function runNormalize(
  recipeId: string,
  ingredients: Array<{
    item: string;
    ua?: string | null;
    en?: string | null;
    category?: string | null;
  }>,
): Promise<{ matched: number; total: number }> {
  type Pending = {
    item: string;
    ua?: string | null;
    en?: string | null;
    category?: string | null;
  };

  const canonicalIngredientIds: string[] = [];
  const unrecognizedIngredients: string[] = [];
  const pending: Pending[] = [];
  const pendingSlots: number[] = [];
  let textMatched = 0;

  for (const ingredient of ingredients) {
    if (NULL_PATTERNS.some((pattern) => pattern.test(ingredient.item.trim()))) {
      unrecognizedIngredients.push(ingredient.item);
      // Keep a slot so canonicalIngredientIds stays index-aligned with
      // ingredients — per-ingredient consumers (the stock dot) rely on it.
      canonicalIngredientIds.push("");
      continue;
    }

    const hit = await matchVocabId(
      ingredient.item,
      ingredient.ua,
      ingredient.en,
    );
    if (hit) {
      textMatched++;
      canonicalIngredientIds.push(hit);
      continue;
    }

    pendingSlots.push(canonicalIngredientIds.length);
    canonicalIngredientIds.push("");
    pending.push(ingredient);
  }

  let embedMatched = 0;
  let provisionalCreated = 0;
  let degraded = false;

  if (pending.length > 0) {
    let matches: Array<string | null> = pending.map(() => null);
    try {
      const res = await fetch(api.ingredientsEmbedMatch, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pending.map((pendingItem) => ({
            item: pendingItem.item,
            ua: pendingItem.ua ?? null,
            en: pendingItem.en ?? null,
          })),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          matches?: Array<string | null>;
          degraded?: boolean;
        };
        if (
          Array.isArray(data.matches) &&
          data.matches.length === pending.length
        ) {
          matches = data.matches;
          degraded = data.degraded ?? false;
        } else {
          // Malformed or misaligned response — fall back to provisionals.
          degraded = true;
        }
      } else {
        // Non-2xx (rate limited, server error) — a degraded fallback, not a hit.
        degraded = true;
      }
    } catch (caughtError) {
      // Network/parse failure — degrade to provisionals rather than report a hit.
      degraded = true;
      logger.error("[normalize] embed-match error:", caughtError);
    }

    for (let i = 0; i < pending.length; i++) {
      const pendingItem = pending[i];
      let matchedId = matches[i];
      if (matchedId) {
        embedMatched++;
      } else {
        // Seed the provisional with the English head when present — it
        // dedupes "2 small zucchini"/"zucchini" to one clean entry.
        const seed = pendingItem.en?.trim() || pendingItem.item;
        matchedId = await createProvisional(
          seed,
          pendingItem.ua,
          pendingItem.category,
        );
        if (matchedId) {
          provisionalCreated++;
          enrichIngredient(
            matchedId,
            seed,
            pendingItem.ua,
            pendingItem.category,
          ).catch(() => {});
        }
      }
      if (matchedId) canonicalIngredientIds[pendingSlots[i]] = matchedId;
    }
  }

  // Store the array index-aligned with ingredients ("" where there's no
  // canonical match). Set-style consumers (the recipe-card matcher) filter the
  // empties; per-ingredient consumers (the stock dot) read by index.
  const matchedCount = canonicalIngredientIds.filter(Boolean).length;
  const updatedAt = new Date();

  trackEvent("embed_match", {
    total: ingredients.length,
    textMatched,
    embedMatched,
    provisionalCreated,
    degraded,
  });

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
