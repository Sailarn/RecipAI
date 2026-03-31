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

export const CATEGORY_COLORS: Record<string, string> = {
  Breakfast: "bg-amber-400 text-amber-950",
  Lunch: "bg-green-400 text-green-950",
  Dinner: "bg-blue-500 text-white",
  Soup: "bg-orange-400 text-orange-950",
  Salad: "bg-lime-400 text-lime-950",
  Snack: "bg-purple-400 text-purple-950",
  Dessert: "bg-pink-400 text-pink-950",
  Baking: "bg-yellow-400 text-yellow-950",
  Drink: "bg-cyan-400 text-cyan-950",
  Other: "bg-gray-400 text-gray-950",
};
