import { api } from "@/lib/routes";
import type { PublicRecipe } from "./types";

// Client-side counterpart to getPublicRecipe() — used as a fallback when a
// recipe isn't on this device and isn't the signed-in user's own (e.g. a
// Telegram deep link to a recipe someone else shared). Never throws: returns
// null when the recipe isn't public or doesn't exist.
export async function fetchPublicRecipe(
  recipeId: string,
): Promise<PublicRecipe | null> {
  const response = await fetch(api.recipePublic(recipeId));
  if (!response.ok) return null;
  const { recipe } = (await response.json()) as { recipe?: PublicRecipe };
  return recipe ?? null;
}
