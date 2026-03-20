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
}

/**
 * Complete recipe with all data
 */
export interface Recipe {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  totalTime?: number; // minutes
  servings: number;
  ingredients: Ingredient[];
  instructions: Step[];
  sourceUrl?: string; // Original URL if parsed from web
  createdAt: Date;
  updatedAt: Date;
}
