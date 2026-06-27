import type { RecipeIngredient, Step } from "@/lib/db/schema";

export interface PublicRecipeOwner {
  name: string;
  image?: string;
}

export interface PublicRecipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageFocusX?: number;
  imageFocusY?: number;
  imageCropX?: number;
  imageCropY?: number;
  imageCropWidth?: number;
  imageCropHeight?: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: Step[];
  sourceUrl?: string;
  category?: string;
  canonicalIngredientIds?: string[];
  owner: PublicRecipeOwner;
}
