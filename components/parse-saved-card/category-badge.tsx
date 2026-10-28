import type { CategoryVisualStyle } from "@/lib/categories";

interface CategoryBadgeProps {
  label: string;
  style: CategoryVisualStyle;
}

export function CategoryBadge({ label, style }: CategoryBadgeProps) {
  return (
    <span
      className="text-[9px] font-bold py-[2px] px-2 rounded-full shrink-0 backdrop-blur-[8px]"
      style={{
        background: style.badgeBackground,
        color: style.color,
        border: `1px solid ${style.color}30`,
      }}
    >
      {label}
    </span>
  );
}
