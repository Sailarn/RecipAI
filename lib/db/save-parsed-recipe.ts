import { isImageKitUrl, uploadImage } from "../images";
import { generateId } from "../utils";
import { createRecipe } from "./recipes";
import type { ParsedRecipeEntry, Recipe } from "./schema";

export async function saveParsedRecipe(
  entry: ParsedRecipeEntry,
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
    ingredients: entry.ingredients.map((ing) => ({
      id: generateId(),
      item: ing.item,
      amount: ing.amount,
      unit: ing.unit,
    })),
    instructions: entry.instructions.map((inst, idx) => ({
      id: generateId(),
      order: idx + 1,
      instruction: inst.instruction,
      imageUrl: inst.imageUrl || undefined,
    })),
    sourceUrl: entry.sourceUrl,
    category: entry.category,
  });

  // upload images in background
  (async () => {
    const { updateRecipe } = await import("./recipes");
    const updates: Partial<Recipe> = {};
    let hasUpdates = false;

    if (entry.imageUrl && !isImageKitUrl(entry.imageUrl)) {
      try {
        const uploaded = await uploadImage(entry.imageUrl);
        updates.imageUrl = uploaded.url;
        updates.imageFileId = uploaded.fileId;
        hasUpdates = true;
      } catch {}
    }

    const updatedInstructions = await Promise.all(
      entry.instructions.map(async (inst, idx) => {
        const imageUrl = inst.imageUrl || undefined;
        if (imageUrl && !isImageKitUrl(imageUrl)) {
          try {
            const uploaded = await uploadImage(imageUrl);
            hasUpdates = true;
            return {
              id: generateId(),
              order: idx + 1,
              instruction: inst.instruction,
              imageUrl: uploaded.url,
            };
          } catch {}
        }
        return {
          id: generateId(),
          order: idx + 1,
          instruction: inst.instruction,
          imageUrl,
        };
      }),
    );

    if (hasUpdates) {
      updates.instructions = updatedInstructions;
      await updateRecipe(id, updates);
    }
  })();
}
