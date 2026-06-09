import { logger } from "@/lib/logger";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { isImageKitUrl, uploadImage } from "../upload/images";
import { generateId } from "../utils";
import { createRecipe, updateRecipe } from "./recipes";
import type { ParsedRecipeEntry, Recipe } from "./schema";

export async function saveParsedRecipe(
  entry: ParsedRecipeEntry,
  uploadToken?: string,
): Promise<void> {
  // save immediately with original URLs
  const id = await createRecipe({
    title: entry.title,
    description: entry.description,
    imageUrl: entry.imageUrl,
    imageFileId: entry.imageFileId,
    prepTime: entry.prepTime,
    cookTime: entry.cookTime,
    totalTime: (entry.prepTime || 0) + (entry.cookTime || 0) || undefined,
    servings: entry.servings,
    ingredients: entry.ingredients.map((ingredient) => ({
      id: generateId(),
      item: ingredient.item,
      amount: ingredient.amount,
      unit: ingredient.unit,
    })),
    instructions: entry.instructions.map((instruction, index) => ({
      id: generateId(),
      order: index + 1,
      instruction: instruction.instruction,
      imageUrl: instruction.imageUrl || undefined,
    })),
    sourceUrl: entry.sourceUrl,
    category: entry.category,
  });

  normalizeRecipeIngredients(id, entry.ingredients).catch((error) => {
    logger.error("[normalize] top-level error:", error);
  });

  // upload images in background
  (async () => {
    const updates: Partial<Recipe> = {};
    let hasUpdates = false;

    const uploadOptions = uploadToken ? { uploadToken } : undefined;

    if (entry.imageUrl && !isImageKitUrl(entry.imageUrl)) {
      try {
        const uploaded = await uploadImage(entry.imageUrl, uploadOptions);
        updates.imageUrl = uploaded.url;
        updates.imageFileId = uploaded.fileId;
        hasUpdates = true;
      } catch {}
    }

    const updatedInstructions = await Promise.all(
      entry.instructions.map(async (instruction, index) => {
        const step = {
          id: generateId(),
          order: index + 1,
          instruction: instruction.instruction,
          imageUrl: instruction.imageUrl || undefined,
        };
        if (step.imageUrl && !isImageKitUrl(step.imageUrl)) {
          try {
            const uploaded = await uploadImage(step.imageUrl, uploadOptions);
            hasUpdates = true;
            return { ...step, imageUrl: uploaded.url };
          } catch {}
        }
        return step;
      }),
    );

    if (hasUpdates) {
      updates.instructions = updatedInstructions;
      await updateRecipe(id, updates);
    }
  })();
}
