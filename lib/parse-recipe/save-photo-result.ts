import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe } from "@/lib/db/schema";
import { isImageKitUrl, uploadImage } from "@/lib/images";
import { routes } from "@/lib/routes";
import { generateId } from "@/lib/utils";

export async function savePhotoParseResult(
  recipe: ParsedRecipe,
  locale: string,
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

  const title = recipe.title || "Recipe parsed";
  toast(title, {
    description: "Recipe parsed — tap to review",
    duration: 10000,
    closeButton: true,
    action: {
      label: "Save",
      onClick: async () => {
        await saveParsedRecipe(saved);
        await db.parsedRecipes.delete(saved.id);
        toast.success("Recipe saved!");
      },
    },
    cancel: {
      label: "Edit",
      onClick: () => {
        localStorage.setItem("parsedRecipe", JSON.stringify(saved));
        db.parsedRecipes.delete(saved.id);
        window.location.href = routes.recipes.new(locale);
      },
    },
  });
}
