import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { api } from "@/lib/routes";
import { db } from "./db";
import type { Recipe } from "./schema";

// Fetch the signed-in owner's own recipe by id from the server and cache it in
// Dexie. Used when a recipe isn't on this device yet — e.g. opening a Telegram
// bot deep link before the full sync has pulled it. Returns the recipe, or null
// when it isn't the user's / doesn't exist. Sets `syncedAt` (a confirmed server
// round-trip) and kicks off ingredient normalization when the pulled recipe has
// none, since bot recipes are saved server-side without canonical ids.
export async function pullOwnRecipe(recipeId: string): Promise<Recipe | null> {
  const res = await fetch(api.recipe(recipeId));
  if (!res.ok) return null;

  const { recipe: row } = (await res.json()) as {
    recipe?:
      | (Omit<Recipe, "createdAt" | "updatedAt"> & {
          createdAt: string;
          updatedAt: string;
        })
      | null;
  };
  if (!row) return null;

  const recipe: Recipe = {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    syncedAt: new Date(),
  };
  await db.recipes.put(recipe);

  if (!recipe.canonicalIngredientIds && recipe.ingredients.length > 0) {
    normalizeRecipeIngredients(
      recipe.id,
      recipe.ingredients.map((ingredient) => ({ item: ingredient.item })),
    ).catch(() => {});
  }

  return recipe;
}
