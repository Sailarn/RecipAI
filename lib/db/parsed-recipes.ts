import { generateId } from "../utils";
import type { ParsedRecipe, ParsedRecipeEntry } from "./schema";

export function createParsedRecipeEntry(
  recipe: ParsedRecipe,
): ParsedRecipeEntry {
  return {
    id: generateId(),
    title: recipe.title,
    description: recipe.description,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings ?? null,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    imageUrl: recipe.imageUrl,
    imageFileId: recipe.imageFileId,
    // An import with no link (photo, text) carries an empty sourceUrl.
    sourceUrl: recipe.sourceUrl || undefined,
    category: recipe.category,
    createdAt: new Date(),
  };
}
