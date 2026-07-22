import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import type { ParsedRecipe } from "@/lib/db/schema";
import { buildSavedRecipeShape } from "./parsed-recipe-shape";

interface SaveParsedRecipeForUserParams {
  userId: string;
  parsed: ParsedRecipe;
  sourceUrl: string | null;
}

// Persist a parsed recipe straight into a user's library, server-side — used by
// the flows that skip the in-app review step: the Telegram bot and Mini-App
// "Telegram notifications" parses both save on the user's behalf. Returns the
// new recipe id so the caller can deep-link the Telegram completion message.
export async function saveParsedRecipeForUser({
  userId,
  parsed,
  sourceUrl,
}: SaveParsedRecipeForUserParams): Promise<string> {
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
    servings: parsed.servings ?? 1,
    ingredients: savedShape.ingredients,
    instructions: savedShape.instructions,
    sections: savedShape.sections,
    sourceUrl,
    category: parsed.category ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return recipeId;
}
