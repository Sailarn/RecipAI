/**
 * Shared category badge styles — single source of truth for all recipe category colors.
 *
 * Source: design-spec/01-tokens.md — Category Badge Colors
 * These are the exact rgba values from the RecipAI Design System prototype.
 */

export interface CategoryStyle {
  /** Background rgba for the badge pill */
  bg: string;
  /** Text/border color for the badge pill */
  color: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  Breakfast: { bg: "rgba(232,89,12,0.22)", color: "#fdba74" },
  Lunch: { bg: "rgba(47,158,68,0.22)", color: "#86efac" },
  Dinner: { bg: "rgba(59,91,219,0.22)", color: "#93c5fd" },
  Soup: { bg: "rgba(234,88,12,0.22)", color: "#fb923c" },
  Salad: { bg: "rgba(47,158,68,0.22)", color: "#86efac" },
  Snack: { bg: "rgba(139,92,246,0.22)", color: "#c4b5fd" },
  Dessert: { bg: "rgba(194,37,92,0.22)", color: "#f9a8d4" },
  Baking: { bg: "rgba(234,179,8,0.22)", color: "#fde047" },
  Drink: { bg: "rgba(6,182,212,0.22)", color: "#67e8f9" },
  Other: { bg: "rgba(100,100,110,0.22)", color: "#d4d4d8" },
};

export const DEFAULT_CATEGORY_STYLE: CategoryStyle = CATEGORY_STYLES.Other;

/**
 * Get the badge style for a given category.
 * Falls back to Other if the category is unknown.
 */
export function getCategoryStyle(
  category: string | null | undefined,
): CategoryStyle {
  if (!category) return DEFAULT_CATEGORY_STYLE;
  return CATEGORY_STYLES[category] ?? DEFAULT_CATEGORY_STYLE;
}
