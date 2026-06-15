import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { db } from "./db";
import { INGREDIENT_STATUS } from "./schema";

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

  const id = crypto.randomUUID();
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
