"use client";

import { useTranslations } from "next-intl";
import type { RecipeIngredient } from "@/lib/db/schema";

interface IngredientsListProps {
  ingredients: RecipeIngredient[];
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  const t = useTranslations("recipes");

  return (
    <div className="bg-[var(--glass-card-bg)] [backdrop-filter:var(--glass-card-blur)] [-webkit-backdrop-filter:var(--glass-card-blur)] border border-[var(--glass-card-border)] rounded-[20px]">
      <div className="px-[14px] py-3 border-b border-[var(--border-subtle)]">
        <h3 className="font-[family-name:var(--font-display)] text-[13px] font-bold text-[var(--fg-1)]">
          {t("ingredients")}
        </h3>
      </div>
      <ul>
        {ingredients.map((ingredient, index) => (
          <li
            key={ingredient.id || `ing-${index}`}
            className={`flex items-center gap-[10px] px-[14px] py-[10px]${index < ingredients.length - 1 ? " border-b border-[var(--border-subtle)]" : ""}`}
          >
            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#f59e0b]" />
            <span className="text-[13px] text-[var(--fg-1)]">
              {ingredient.amount && (
                <span className="font-semibold">{ingredient.amount} </span>
              )}
              {ingredient.unit && `${ingredient.unit} `}
              {ingredient.item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
