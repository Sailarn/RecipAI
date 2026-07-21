"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import {
  groupBySectionId,
  sectionName,
  shouldShowSections,
} from "@/lib/db/recipe-sections";
import type { RecipeIngredient, RecipeSection } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { IngredientRow } from "./ingredient-row";
import { useServingsCalculator } from "./use-servings-calculator";

function groupWithIndex(
  ingredients: RecipeIngredient[],
  sections: RecipeSection[] | undefined,
): {
  sectionId: string | null;
  items: { ingredient: RecipeIngredient; index: number }[];
}[] {
  const indexed = ingredients.map((ingredient, index) => ({
    ingredient,
    index,
    sectionId: ingredient.sectionId,
  }));
  return groupBySectionId(indexed, sections).map((group) => ({
    sectionId: group.sectionId,
    items: group.items.map(({ ingredient, index }) => ({ ingredient, index })),
  }));
}

interface ServingsCalculatorProps {
  originalServings: number;
  ingredients: RecipeIngredient[];
  sections?: RecipeSection[];
  canonicalIngredientIds?: string[];
  locale?: string;
}

export function ServingsCalculator({
  originalServings,
  ingredients,
  sections,
  canonicalIngredientIds,
  locale,
}: ServingsCalculatorProps) {
  const t = useTranslations("recipes");
  const {
    servings,
    setServings,
    useCanonical,
    setUseCanonical,
    hasCanonical,
    normalizationPending,
    canAddToPantry,
    formatAmount,
    stockStatus,
    displayName,
    pantryItemFor,
    addToPantry,
  } = useServingsCalculator({
    originalServings,
    canonicalIngredientIds,
    locale,
  });

  return (
    <div className="glass-card mb-4" style={{ borderRadius: 20 }}>
      <div className="px-[14px] py-3 border-b border-b-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-[9px]">
          <span className="text-[11px] font-semibold text-[var(--fg-2)] uppercase tracking-[0.06em]">
            Servings
          </span>
          {hasCanonical && (
            <div className="flex rounded-[8px] border border-[var(--border-subtle)] overflow-hidden">
              {(["parsed", "original"] as const).map((mode) => {
                const isActive = (mode === "parsed") === useCanonical;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setUseCanonical(mode === "parsed")}
                    className={cn(
                      "py-[3px] px-[9px] text-[10px] font-semibold border-0 cursor-pointer transition-[background,color] duration-150",
                      isActive
                        ? "bg-[var(--food-accent)] text-white"
                        : "bg-transparent text-[var(--fg-3)]",
                    )}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-[14px]">
          <button
            type="button"
            aria-label="Decrease servings"
            onClick={() => setServings((prev) => Math.max(1, prev - 1))}
            className="w-8 h-8 rounded-[10px] bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] backdrop-blur-[12px] text-[var(--fg-1)] cursor-pointer flex items-center justify-center"
          >
            <MinusIcon size={14} />
          </button>
          <span className="text-[18px] font-bold text-[var(--fg-1)] min-w-6 text-center">
            {servings}
          </span>
          <button
            type="button"
            aria-label="Increase servings"
            onClick={() => setServings((prev) => prev + 1)}
            className="w-8 h-8 rounded-[10px] bg-[var(--glass-card-bg)] border border-[var(--glass-card-border)] backdrop-blur-[12px] text-[var(--fg-1)] cursor-pointer flex items-center justify-center"
          >
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      {(() => {
        const groups = groupWithIndex(ingredients, sections);
        const showSections = shouldShowSections(
          ingredients.map((ingredient) => ingredient.sectionId),
        );
        return groups.map((group, groupIndex) => {
          const name = group.sectionId
            ? sectionName(group.sectionId, sections)
            : t("mainSection");
          return (
            <div key={group.sectionId ?? `group-${groupIndex}`}>
              {showSections && name && (
                <div className="px-[14px] pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-2)]">
                  {name}
                </div>
              )}
              <ul>
                {group.items.map(({ ingredient, index }) => (
                  <IngredientRow
                    key={ingredient.id || `ing-${index}`}
                    ingredient={ingredient}
                    isLast={index === ingredients.length - 1}
                    scaledAmount={formatAmount(ingredient.amount)}
                    status={stockStatus(ingredient, index)}
                    name={displayName(ingredient, index)}
                    locale={(locale === "ua" ? "ua" : "en") as Locale}
                    showOriginal={!useCanonical}
                    pantryItem={pantryItemFor(ingredient, index)}
                    pending={normalizationPending}
                    canAdd={canAddToPantry(index)}
                    onAdd={() => addToPantry(ingredient, index)}
                  />
                ))}
              </ul>
            </div>
          );
        });
      })()}
    </div>
  );
}
