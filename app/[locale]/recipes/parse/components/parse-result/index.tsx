"use client";

import {
  CATEGORY_VISUAL_STYLES,
  DEFAULT_CATEGORY_VISUAL_STYLE,
} from "@/lib/categories";
import type { ParsedRecipe } from "@/lib/db/schema";
import { CategoryBadge } from "../category-badge";
import { IngredientsPreview } from "../ingredients-preview";

interface ParseResultProps {
  result: ParsedRecipe;
  onSave: () => void;
  onReset: () => void;
}

export function ParseResult({ result, onSave, onReset }: ParseResultProps) {
  const categoryStyle = result.category
    ? (CATEGORY_VISUAL_STYLES[result.category] ?? DEFAULT_CATEGORY_VISUAL_STYLE)
    : DEFAULT_CATEGORY_VISUAL_STYLE;

  const metaParts: string[] = [];
  if (result.servings) metaParts.push(`🍽️ ${result.servings} servings`);
  if (result.prepTime || result.cookTime) {
    const totalTime = (result.prepTime ?? 0) + (result.cookTime ?? 0);
    metaParts.push(`⏱ ${totalTime}m`);
  }

  return (
    <div className="glass-card rounded-[20px] mt-4 overflow-hidden">
      {/* Gradient header strip */}
      <div
        className="h-20 flex items-center justify-center text-[36px] shrink-0"
        style={{ background: categoryStyle.gradient }}
      >
        {categoryStyle.emoji}
      </div>

      {/* Body */}
      <div className="px-[14px] py-[12px]">
        {/* Title row */}
        <div className="flex justify-between items-center mb-[5px]">
          <p className="font-heading text-[14px] font-bold text-[var(--fg-1)] flex-1 mr-2">
            {result.title}
          </p>
          {result.category && (
            <CategoryBadge label={result.category} style={categoryStyle} />
          )}
        </div>

        {/* Meta */}
        {metaParts.length > 0 && (
          <p className="text-[11px] text-[var(--fg-2)] mb-3">
            {metaParts.join(" · ")}
          </p>
        )}

        <IngredientsPreview ingredients={result.ingredients} />

        {result.instructions.length > 0 && (
          <p className="text-[11px] text-[var(--fg-3)] mb-3">
            {result.instructions.length} steps
          </p>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={onSave}
          className="w-full py-[10px] bg-[var(--action-primary)] text-white rounded-[13px] border-none font-sans text-[13px] font-semibold cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.4)] mb-2"
        >
          Edit &amp; Save Recipe
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 px-[10px] bg-[rgba(255,170,50,0.08)] text-[var(--fg-2)] rounded-[13px] border border-[rgba(255,200,100,0.18)] font-sans text-[13px] font-medium cursor-pointer"
        >
          Parse Another
        </button>
      </div>
    </div>
  );
}
