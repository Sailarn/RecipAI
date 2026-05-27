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

// Tailwind class-based colours — used in filter chips and category tags.
export const CATEGORY_COLORS: Record<RecipeCategory, string> = {
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

export interface CategoryVisualStyle {
  gradient: string;
  emoji: string;
  badgeBackground: string;
  color: string;
}

// Rich visual styles for parse-result cards and any future preview surfaces.
// Typed against RecipeCategory so TypeScript enforces a complete entry for
// every category — adding a new category to RECIPE_CATEGORIES will cause a
// compile error here until its visual style is provided.
export const CATEGORY_VISUAL_STYLES: Record<
  RecipeCategory,
  CategoryVisualStyle
> = {
  Breakfast: {
    gradient: "linear-gradient(160deg, #7c3a00, #3d1800)",
    emoji: "🍳",
    badgeBackground: "rgba(232,89,12,0.22)",
    color: "#fdba74",
  },
  Lunch: {
    gradient: "linear-gradient(160deg, #064e3b, #052e16)",
    emoji: "🥗",
    badgeBackground: "rgba(47,158,68,0.22)",
    color: "#86efac",
  },
  Dinner: {
    gradient: "linear-gradient(160deg, #1e1b4b, #0f172a)",
    emoji: "🍽️",
    badgeBackground: "rgba(59,91,219,0.22)",
    color: "#93c5fd",
  },
  Soup: {
    gradient: "linear-gradient(160deg, #7c2d12, #431407)",
    emoji: "🍲",
    badgeBackground: "rgba(234,88,12,0.22)",
    color: "#fb923c",
  },
  Salad: {
    gradient: "linear-gradient(160deg, #14532d, #0a2512)",
    emoji: "🥗",
    badgeBackground: "rgba(47,158,68,0.22)",
    color: "#86efac",
  },
  Snack: {
    gradient: "linear-gradient(160deg, #2e1065, #0f0a1e)",
    emoji: "🍿",
    badgeBackground: "rgba(139,92,246,0.22)",
    color: "#c4b5fd",
  },
  Dessert: {
    gradient: "linear-gradient(160deg, #4a0020, #1e0010)",
    emoji: "🍰",
    badgeBackground: "rgba(194,37,92,0.22)",
    color: "#f9a8d4",
  },
  Baking: {
    gradient: "linear-gradient(160deg, #713f12, #3d2105)",
    emoji: "🍞",
    badgeBackground: "rgba(234,179,8,0.22)",
    color: "#fde047",
  },
  Drink: {
    gradient: "linear-gradient(160deg, #0c4a6e, #042f4b)",
    emoji: "🥤",
    badgeBackground: "rgba(6,182,212,0.22)",
    color: "#67e8f9",
  },
  Other: {
    gradient: "linear-gradient(160deg, #1c1c2e, #0f0f1a)",
    emoji: "🍴",
    badgeBackground: "rgba(100,100,110,0.22)",
    color: "#d4d4d8",
  },
};

export const DEFAULT_CATEGORY_VISUAL_STYLE = CATEGORY_VISUAL_STYLES.Other;
