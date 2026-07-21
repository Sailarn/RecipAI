import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { db } from "./db";

// Normalize any local recipe that has ingredients but no canonicalIngredientIds
// yet — e.g. a recipe parsed by the Telegram bot (created server-side, pulled to
// this device without canonical ids) or an older local recipe. Fire-and-forget
// per recipe; idempotent, since a normalized recipe has a defined array and is
// skipped next time. Run on startup and after each sync so freshly pulled
// recipes light up their pantry dots without waiting for an app restart.
export async function normalizePendingRecipes(): Promise<void> {
  const pending = await db.recipes
    .filter(
      (recipe) =>
        !recipe.canonicalIngredientIds && recipe.ingredients.length > 0,
    )
    .toArray();

  for (const recipe of pending) {
    normalizeRecipeIngredients(
      recipe.id,
      recipe.ingredients.map((ingredient) => ({ item: ingredient.item })),
    ).catch(() => {});
  }
}
