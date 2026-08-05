import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { isImageKitUrl, uploadImage } from "@/lib/upload/images";
import { generateId } from "@/lib/utils";

/**
 * Copy for the review toast. Passed in rather than translated here: this is a
 * plain async function, so it has no access to a next-intl hook.
 */
export interface PhotoParseLabels {
  fallbackTitle: string;
  description: string;
  save: string;
  edit: string;
  saved: string;
}

export async function savePhotoParseResult(
  recipe: ParsedRecipe,
  locale: string,
  labels: PhotoParseLabels,
): Promise<void> {
  const entry = {
    id: generateId(),
    title: recipe.title,
    description: recipe.description,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings ?? 1,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    imageUrl: recipe.imageUrl,
    sourceUrl: undefined as string | undefined,
    category: recipe.category,
    createdAt: new Date(),
  };

  let imageUrl = entry.imageUrl;
  let imageFileId: string | undefined;
  if (imageUrl && !isImageKitUrl(imageUrl)) {
    try {
      const uploaded = await uploadImage(imageUrl);
      imageUrl = uploaded.url;
      imageFileId = uploaded.fileId;
    } catch {
      // continue without uploaded image
    }
  }

  const saved = { ...entry, imageUrl, imageFileId };
  await db.parsedRecipes.add(saved);

  const title = recipe.title || labels.fallbackTitle;
  toast(title, {
    description: labels.description,
    duration: 10000,
    closeButton: true,
    action: {
      label: labels.save,
      onClick: async () => {
        await saveParsedRecipe(saved);
        await db.parsedRecipes.delete(saved.id);
        toast.success(labels.saved);
      },
    },
    cancel: {
      label: labels.edit,
      onClick: () => {
        localStorage.setItem("parsedRecipe", JSON.stringify(saved));
        db.parsedRecipes.delete(saved.id);
        window.location.href = routes.recipes.new(locale);
      },
    },
  });
}
