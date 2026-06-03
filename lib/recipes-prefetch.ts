import { getAllCollections } from "@/lib/db/collections";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Collection, Recipe } from "@/lib/db/schema";

/**
 * Module-level cache shared between the prefetch call site (bottom nav) and
 * the RecipesPage consumer. Populated as soon as the user touches the Recipes
 * tab so the page renders with data from frame 1 instead of showing a skeleton.
 */
export const recipesPageCache: {
  recipes: Recipe[] | undefined;
  collections: Collection[] | undefined;
} = {
  recipes: undefined,
  collections: undefined,
};

/**
 * Fire-and-forget prefetch. Safe to call multiple times — later results
 * overwrite earlier ones. Errors are silently swallowed; the live-query
 * subscription in RecipesPage is the source of truth.
 */
export function prefetchRecipesPage(): void {
  getAllRecipes()
    .then((recipes) => {
      recipesPageCache.recipes = recipes;
    })
    .catch(() => {});
  getAllCollections()
    .then((collections) => {
      recipesPageCache.collections = collections;
    })
    .catch(() => {});
}
