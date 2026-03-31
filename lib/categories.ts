export const RECIPE_CATEGORIES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Soup",
  "Salad",
  "Snack",
  "Dessert",
  "Baking",
  "Drink",
  "Other",
] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
