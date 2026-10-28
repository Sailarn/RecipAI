"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeDetail } from "@/components/recipe-detail";
import {
  CATEGORY_VISUAL_STYLES,
  DEFAULT_CATEGORY_VISUAL_STYLE,
  RECIPE_CATEGORIES,
  type RecipeCategory,
} from "@/lib/categories";
import type { ParsedRecipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { CategoryBadge } from "./category-badge";
import { IngredientsPreview } from "./ingredients-preview";

interface ParseSavedCardProps {
  locale: string;
  recipeId: string;
  recipe: ParsedRecipe;
  alreadySaved: boolean;
  onReset: () => void;
}

function isRecipeCategory(
  category: string | undefined,
): category is RecipeCategory {
  return RECIPE_CATEGORIES.some(
    (recipeCategory) => recipeCategory === category,
  );
}

/** A finished import on the parse page — already in the library. */
export function ParseSavedCard({
  locale,
  recipeId,
  recipe,
  alreadySaved,
  onReset,
}: ParseSavedCardProps) {
  const t = useTranslations("parse");
  const tRecipes = useTranslations("recipes");
  const navigate = useNavigate();
  const category = isRecipeCategory(recipe.category)
    ? recipe.category
    : undefined;
  const categoryStyle = category
    ? CATEGORY_VISUAL_STYLES[category]
    : DEFAULT_CATEGORY_VISUAL_STYLE;

  const metaParts: string[] = [];
  if (recipe.servings) {
    metaParts.push(
      `🍽️ ${tRecipes("servingsCount", { count: recipe.servings })}`,
    );
  }
  if (recipe.prepTime || recipe.cookTime) {
    const totalTime = (recipe.prepTime ?? 0) + (recipe.cookTime ?? 0);
    metaParts.push(`⏱ ${totalTime}m`);
  }

  const openRecipe = () =>
    navigate.push(
      routes.recipes.detail(locale, recipeId),
      <RecipeDetail recipeId={recipeId} locale={locale} via="import" />,
    );

  return (
    <div className="glass-card rounded-[20px] mt-4 overflow-hidden">
      {/* Gradient header strip */}
      <div
        className="h-20 flex items-center justify-center text-[36px] shrink-0"
        style={{ background: categoryStyle.gradient }}
      >
        {categoryStyle.emoji}
      </div>

      <div className="px-[14px] py-[12px]">
        <div className="flex justify-between items-center mb-[5px]">
          <p className="font-heading text-[14px] font-bold text-[var(--fg-1)] flex-1 mr-2">
            {recipe.title}
          </p>
          {category && <CategoryBadge label={category} style={categoryStyle} />}
        </div>

        {metaParts.length > 0 && (
          <p className="text-[11px] text-[var(--fg-2)] mb-3">
            {metaParts.join(" · ")}
          </p>
        )}

        <IngredientsPreview ingredients={recipe.ingredients} />

        {recipe.instructions.length > 0 && (
          <p className="text-[11px] text-[var(--fg-3)] mb-3">
            {t("savedCard.steps", { count: recipe.instructions.length })}
          </p>
        )}

        <p className="flex items-center gap-[6px] text-[12px] font-medium text-[var(--fg-2)] mb-3">
          <Check size={14} className="text-[var(--action-primary)]" />
          {alreadySaved ? t("alreadySaved") : t("addedToRecipes")}
        </p>

        <button
          type="button"
          onClick={openRecipe}
          className="w-full py-[10px] bg-[var(--action-primary)] text-white rounded-[13px] border-none font-sans text-[13px] font-semibold cursor-pointer shadow-[0_4px_14px_rgba(59,130,246,0.4)] mb-2"
        >
          {t("savedCard.open")}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 px-[10px] bg-[rgba(255,170,50,0.08)] text-[var(--fg-2)] rounded-[13px] border border-[rgba(255,200,100,0.18)] font-sans text-[13px] font-medium cursor-pointer"
        >
          {t("savedCard.parseAnother")}
        </button>
      </div>
    </div>
  );
}
