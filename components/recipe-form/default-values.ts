import type { Recipe } from "@/lib/db/schema";
import type { RecipeFormData } from "./schema";

export function getDefaultValues(recipe: Recipe): RecipeFormData {
  return {
    title: recipe.title,
    description: recipe.description || "",
    imageUrl: recipe.imageUrl || "",
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    servings: recipe.servings != null ? String(recipe.servings) : "",
    ingredients: recipe.ingredients.map((ingredient) => ({
      rowId: ingredient.id,
      item: ingredient.item,
      amount: ingredient.amount != null ? String(ingredient.amount) : "",
      unit: ingredient.unit || "",
      modifiers: ingredient.modifiers ?? [],
      sectionId: ingredient.sectionId ?? null,
      original: ingredient.original,
    })),
    instructions: recipe.instructions.map((instruction) => ({
      rowId: instruction.id,
      instruction: instruction.instruction,
      imageUrl: instruction.imageUrl || "",
      sectionId: instruction.sectionId ?? null,
    })),
    sections: recipe.sections ?? [],
    sourceUrl: recipe.sourceUrl || "",
    category: recipe.category || "",
    imageFocusX: recipe.imageFocusX ?? undefined,
    imageFocusY: recipe.imageFocusY ?? undefined,
    imageCropX: recipe.imageCropX ?? undefined,
    imageCropY: recipe.imageCropY ?? undefined,
    imageCropWidth: recipe.imageCropWidth ?? undefined,
    imageCropHeight: recipe.imageCropHeight ?? undefined,
  };
}
