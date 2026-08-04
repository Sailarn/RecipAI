"use client";

import { useCategoryLabel } from "@/hooks/use-category-label";

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
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

const FALLBACK = CATEGORY_COLORS.Other;

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const categoryLabel = useCategoryLabel();
  const { bg, color } = CATEGORY_COLORS[category] ?? FALLBACK;

  return (
    <span
      className="text-[9px] font-bold px-[9px] py-[3px] rounded-full shrink-0 mt-1 border"
      style={{
        background: bg,
        color,
        borderColor: `${color}30`,
      }}
    >
      {categoryLabel(category)}
    </span>
  );
}
