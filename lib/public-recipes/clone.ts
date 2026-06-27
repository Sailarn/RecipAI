import type { Recipe } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import type { PublicRecipe } from "./types";

type NewRecipe = Omit<Recipe, "id" | "createdAt" | "updatedAt">;

export function clonePublicRecipe(
  recipe: PublicRecipe,
  nextId: () => string = generateId,
): NewRecipe {
  const { owner: _owner, id: _id, ...content } = recipe;
  return {
    ...content,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      id: nextId(),
    })),
    instructions: recipe.instructions.map((instruction, index) => ({
      ...instruction,
      id: nextId(),
      order: index + 1,
    })),
    status: null,
    collectionIds: [],
    unrecognizedIngredients: [],
    isPublic: false,
  };
}
