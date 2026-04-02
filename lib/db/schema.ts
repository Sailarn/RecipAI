/**
 * Single ingredient in a recipe
 */
export interface Ingredient {
  id: string; // Unique ID for this ingredient
  amount?: number; // Optional: 2, 1.5, 0.25
  unit?: string; // Optional: "cup", "tbsp", "g", "ml"
  item: string; // Required: "flour", "eggs", "salt"
}

/**
 * Single instruction step in a recipe
 */
export interface Step {
  id: string; // Unique ID for this step
  order: number; // Step number: 1, 2, 3...
  instruction: string; // The actual instruction text
  imageUrl?: string;
}

/**
 * Complete recipe with all data
 */
export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  imageFileId?: string;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings: number;
  ingredients: Ingredient[];
  instructions: Step[];
  sourceUrl?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParsedRecipeEntry {
  id: string;
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{ amount?: number; unit?: string; item: string }>;
  instructions: Array<{ order: number; instruction: string, imageUrl?: string }>;
  imageUrl?: string;
  imageFileId?: string;
  sourceUrl?: string;
  category?: string;
  createdAt: Date;
}
