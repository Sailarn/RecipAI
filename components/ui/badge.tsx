import { useCategoryLabel } from "@/hooks/use-category-label";
import type * as React from "react";

import { getCategoryStyle } from "@/lib/category-styles";

interface BadgeProps {
  category: string | null | undefined;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Category badge pill — renders a recipe category chip with DS-specified colors.
 *
 * Style per design-spec/02-primitives.md:
 *   font: 9px / 700 / Inter
 *   padding: 2px 8px
 *   border-radius: 99px
 *   border: 1px solid {textColor}30
 *
 * No backdrop-filter: the badge sits on every recipe card, and a blur per
 * card (nested inside the thumbnail's dark pill) re-composites on each scroll
 * frame — the main source of list jank on phones.
 */
export function Badge({ category, className = "", style }: BadgeProps) {
  const categoryLabel = useCategoryLabel();
  const badge = getCategoryStyle(category);

  return (
    <span
      className={className}
      style={{
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        padding: "2px 8px",
        borderRadius: 99,
        background: badge.bg,
        color: badge.color,
        border: `1px solid ${badge.color}30`,
        lineHeight: 1,
        display: "inline-block",
        ...style,
      }}
    >
      {categoryLabel(category)}
    </span>
  );
}
