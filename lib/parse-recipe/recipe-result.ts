import type { ParsedRecipe } from "@/lib/db/schema";

export interface NotRecipeResult {
  notRecipe: true;
}

export type RecipeExtractionResult = ParsedRecipe | NotRecipeResult;

type RecipeSource = "page" | "photo";

export function requireCompleteRecipe(
  result: RecipeExtractionResult,
  source: RecipeSource,
): ParsedRecipe {
  if (
    "notRecipe" in result ||
    !Array.isArray(result.ingredients) ||
    result.ingredients.length === 0 ||
    !Array.isArray(result.instructions) ||
    result.instructions.length === 0
  ) {
    throw new Error(`Couldn't extract a recipe from this ${source}`);
  }

  return result;
}
