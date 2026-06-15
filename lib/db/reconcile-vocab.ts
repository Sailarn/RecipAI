import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { db } from "./db";
import { pullVocab } from "./sync-vocab";

// Run once per device after the server-side dup-ingredient cleanup SQL has
// been executed. Clears the stale Dexie ingredients table (which never deletes
// via the normal delta pull), resets the sync watermark so the next pullVocab
// fetches the full clean vocab, then re-resolves every recipe's
// canonicalIngredientIds against the surviving canonical ids.
// Self-limiting via a localStorage guard — cheap no-op once done.
const RECONCILE_KEY = "vocabReconciled_v1";

export async function reconcileVocab(): Promise<void> {
  if (localStorage.getItem(RECONCILE_KEY) === "1") return;

  await db.ingredients.clear();
  localStorage.removeItem("ingredientsSyncedAt");
  await pullVocab();

  const recipes = await db.recipes.toArray();
  for (const recipe of recipes) {
    await normalizeRecipeIngredients(
      recipe.id,
      recipe.ingredients.map((ingredient) => ({ item: ingredient.item })),
    );
  }

  localStorage.setItem(RECONCILE_KEY, "1");
}
