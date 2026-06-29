import { apiFetch } from "@/lib/api/api-fetch";
import type { Recipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";

export async function setRecipeVisibility(
  recipe: Recipe,
  isPublic: boolean,
): Promise<void> {
  const response = await apiFetch(api.recipeVisibility(recipe.id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      isPublic ? { isPublic: true, recipe } : { isPublic: false },
    ),
  });
  if (!response.ok)
    throw new Error(`Visibility update failed: ${response.status}`);
}
