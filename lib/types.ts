// Shared domain types used across app, lib, and API layers.

export interface ParsedRecipe {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings: number;
  ingredients: Array<{
    amount?: number;
    unit?: string;
    item: string;
    ua?: string | null;
    category?: string | null;
  }>;
  instructions: Array<{ order: number; instruction: string }>;
  imageUrl?: string;
  sourceUrl: string;
  category?: string;
}
