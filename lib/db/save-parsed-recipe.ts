import { logger } from "@/lib/logger";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { normalizeSourceUrl } from "@/lib/parse-recipe/normalize-url";
import { buildSavedRecipeShape } from "@/lib/parse-recipe/parsed-recipe-shape";
import { trackEvent } from "@/lib/telemetry";
import { isImageKitUrl, uploadImage } from "../upload/images";
import { db } from "./db";
import { createParsedRecipeEntry } from "./parsed-recipes";
import { createRecipe, updateRecipe } from "./recipes";
import type { ParsedRecipe, ParsedRecipeEntry, Recipe } from "./schema";

export interface SavedParseRef {
  recipeId: string;
  /** The link was already in the library — nothing new was written. */
  alreadySaved: boolean;
}

/** The newest local recipe imported from the same link (normalized). */
export async function findLocalRecipeIdBySource(
  sourceUrl: string,
): Promise<string | null> {
  const target = normalizeSourceUrl(sourceUrl);
  const matches = await db.recipes
    .filter(
      (recipe) =>
        Boolean(recipe.sourceUrl) &&
        normalizeSourceUrl(recipe.sourceUrl ?? "") === target,
    )
    .toArray();
  const newest = matches.sort(
    (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
  )[0];
  return newest?.id ?? null;
}

/**
 * Saves a finished parse into the local library — the completion path for
 * parses with no server-side save (anonymous link imports, photo and text). A
 * link that is already in the library is not saved twice: the existing recipe
 * is returned instead.
 */
export async function saveParsedResult(
  recipe: ParsedRecipe,
  uploadToken?: string,
): Promise<SavedParseRef> {
  if (recipe.sourceUrl) {
    const existingId = await findLocalRecipeIdBySource(recipe.sourceUrl);
    if (existingId) return { recipeId: existingId, alreadySaved: true };
  }
  const recipeId = await saveParsedRecipe(
    createParsedRecipeEntry(recipe),
    uploadToken,
  );
  return { recipeId, alreadySaved: false };
}

export async function saveParsedRecipe(
  entry: ParsedRecipeEntry,
  uploadToken?: string,
): Promise<string> {
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

  // Every on-device parse save funnels through here (link imports while signed
  // out, photo, text, leftover drafts), so this is the single tracking point
  // for them — server-side saves are tracked where the client learns of them,
  // and the edit/form path tracks recipe_saved separately.
  trackEvent("recipe_saved", { source: "auto" });

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

  return id;
}
