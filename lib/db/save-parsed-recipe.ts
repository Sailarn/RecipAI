import { logger } from "@/lib/logger";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { buildSavedRecipeShape } from "@/lib/parse-recipe/parsed-recipe-shape";
import { trackEvent } from "@/lib/telemetry";
import { isImageKitUrl, uploadImage } from "../upload/images";
import { createRecipe, updateRecipe } from "./recipes";
import type { ParsedRecipeEntry, Recipe } from "./schema";

export async function saveParsedRecipe(
  entry: ParsedRecipeEntry,
  uploadToken?: string,
): Promise<void> {
  const savedShape = buildSavedRecipeShape(entry);

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
    ...savedShape,
    sourceUrl: entry.sourceUrl,
    category: entry.category,
  });

  // Every parse-originated save funnels through here (parsed-recipes sheet,
  // background watcher, photo save), so this is the single tracking point for
  // them — the edit/form path tracks recipe_saved separately.
  trackEvent("recipe_saved", { source: "parse" });

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
      savedShape.instructions.map(async (step) => {
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
