import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { db } from "./db";

// One-time data upgrade. Older recipes stored canonicalIngredientIds compacted
// (null-pattern/unmatched ingredients dropped), so the array wasn't index-
// aligned with ingredients and the per-ingredient stock dot read the wrong
// slot — including across languages. Re-run normalize on any recipe whose
// stored array length doesn't match its ingredient count, which also refreshes
// canonical resolution against the current vocab. Self-limiting: once a recipe
// is aligned the lengths match and it's skipped on later passes.
export async function renormalizeOutdatedRecipes(): Promise<void> {
  const recipes = await db.recipes.toArray();
  for (const recipe of recipes) {
    const ids = recipe.canonicalIngredientIds ?? [];
    if (ids.length === recipe.ingredients.length) continue;
    await normalizeRecipeIngredients(
      recipe.id,
      recipe.ingredients.map((ingredient) => ({ item: ingredient.item })),
    );
  }
}
