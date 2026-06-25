import { generateId } from "../utils";
import { db } from "./db";
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
    servings: recipe.servings ?? 1,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    imageUrl: recipe.imageUrl,
    imageFileId: recipe.imageFileId,
    sourceUrl: recipe.sourceUrl,
    category: recipe.category,
    createdAt: new Date(),
  };
}

export async function addParsedRecipeResult(
  recipe: ParsedRecipe,
): Promise<ParsedRecipeEntry> {
  const entry = createParsedRecipeEntry(recipe);
  await db.parsedRecipes.add(entry);
  return entry;
}
