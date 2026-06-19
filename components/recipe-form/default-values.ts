import type { Recipe } from "@/lib/db/schema";
import type { RecipeFormData } from "./schema";

interface ParsedRecipeData {
  title?: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number;
  ingredients?: Array<{
    item: string;
    amount?: number | null;
    unit?: string | null;
  }>;
  instructions?: Array<{
    instruction: string;
    order?: number;
    imageUrl?: string;
  }>;
  sourceUrl?: string;
  category?: string;
}

export function getDefaultValues(
  recipe?: Recipe,
  initialData?: ParsedRecipeData,
): RecipeFormData {
  if (recipe) {
    return {
      title: recipe.title,
      description: recipe.description || "",
      imageUrl: recipe.imageUrl || "",
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: String(recipe.servings),
      ingredients: recipe.ingredients.map((ing) => ({
        item: ing.item,
        amount: ing.amount != null ? String(ing.amount) : "",
        unit: ing.unit || "",
      })),
      instructions: recipe.instructions.map((inst) => ({
        instruction: inst.instruction,
        imageUrl: inst.imageUrl || "",
      })),
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

  if (initialData) {
    return {
      title: initialData.title || "",
      description: initialData.description || "",
      imageUrl: initialData.imageUrl || "",
      prepTime: initialData.prepTime ?? undefined,
      cookTime: initialData.cookTime ?? undefined,
      servings: String(initialData.servings || 1),
      ingredients: initialData.ingredients?.length
        ? initialData.ingredients.map((ing) => ({
            item: ing.item || "",
            amount: ing.amount != null ? String(ing.amount) : "",
            unit: ing.unit || "",
          }))
        : [{ item: "", amount: "1", unit: "" }],
      instructions: initialData.instructions?.length
        ? initialData.instructions.map((inst) => ({
            instruction: inst.instruction || "",
            imageUrl: inst.imageUrl || "",
          }))
        : [{ instruction: "", imageUrl: "" }],
      sourceUrl: initialData.sourceUrl || "",
      category: initialData.category || "",
    };
  }

  return {
    title: "",
    description: "",
    imageUrl: "",
    servings: "1",
    ingredients: [{ item: "", amount: "", unit: "" }],
    instructions: [{ instruction: "" }],
    sourceUrl: "",
    category: "",
  };
}

export type { ParsedRecipeData };
