import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import type { ParsedRecipe } from "@/lib/db/schema";
import { findRecipeIdBySource } from "./find-recipe-by-source";
import { buildSavedRecipeShape } from "./parsed-recipe-shape";

interface SaveParsedRecipeForUserParams {
  userId: string;
  parsed: ParsedRecipe;
  sourceUrl: string | null;
}

export interface SavedRecipeRef {
  recipeId: string;
  /** The link was already in the user's library — nothing new was written. */
  alreadySaved: boolean;
}

// Persist a parsed recipe straight into a user's library, server-side — the
// completion path for every signed-in parse (in-app link imports and the
// Telegram bot alike). A link the user already imported is not saved twice:
// the existing recipe is returned instead.
export async function saveParsedRecipeForUser({
  userId,
  parsed,
  sourceUrl,
}: SaveParsedRecipeForUserParams): Promise<SavedRecipeRef> {
  if (sourceUrl) {
    const existingId = await findRecipeIdBySource(userId, sourceUrl);
    if (existingId) return { recipeId: existingId, alreadySaved: true };
  }

  const savedShape = buildSavedRecipeShape(parsed);
  const recipeId = crypto.randomUUID();

  await db.insert(recipes).values({
    id: recipeId,
    userId,
    title: parsed.title,
    description: parsed.description ?? null,
    imageUrl: parsed.imageUrl ?? null,
    imageFileId: parsed.imageFileId ?? null,
    prepTime: parsed.prepTime ?? null,
    cookTime: parsed.cookTime ?? null,
    totalTime: (parsed.prepTime || 0) + (parsed.cookTime || 0) || null,
    servings: parsed.servings ?? null,
    ingredients: savedShape.ingredients,
    instructions: savedShape.instructions,
    sections: savedShape.sections,
    sourceUrl,
    category: parsed.category ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { recipeId, alreadySaved: false };
}
