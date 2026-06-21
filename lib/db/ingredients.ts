import { matchVocabId } from "@/lib/parse-recipe/vocab-match";
import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { generateId } from "@/lib/utils";
import { db } from "./db";
import { INGREDIENT_STATUS } from "./schema";

// Resolve raw text to an ingredient id for pantry/recipe use: prefer a
// confirmed-vocab canonical match (cross-language — "борошно" and "flour" land
// on the same id, so the pantry and a recipe agree), and only mint a
// provisional when nothing matches.
export async function resolveOrCreateIngredient(
  rawText: string,
): Promise<string> {
  return (
    (await matchVocabId(rawText)) ??
    (await createProvisionalIngredient(rawText))
  );
}

export async function createProvisionalIngredient(
  rawText: string,
): Promise<string> {
  const normalized = rawText.trim().toLowerCase();

  // Idempotent by name: if an ingredient with the same normalized text already
  // exists, reuse its id instead of minting a new provisional. A fresh UUID per
  // add would slip past the pantry's ingredientId-keyed dedup and duplicate the
  // row (e.g. re-adding "salt" without picking the autocomplete suggestion).
  const existing = await db.ingredients
    .filter((entry) => entry.en.trim().toLowerCase() === normalized)
    .first();
  if (existing) return existing.id;

  const id = generateId();
  await db.ingredients.add({
    id,
    en: rawText,
    ua: null,
    category: "Other",
    aliasesEn: [],
    aliasesUa: [],
    status: INGREDIENT_STATUS.PROVISIONAL,
    retryCount: 0,
    lastAttemptAt: null,
  });
  syncFetch(api.ingredientsEnrich, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, rawText }),
  });
  return id;
}
