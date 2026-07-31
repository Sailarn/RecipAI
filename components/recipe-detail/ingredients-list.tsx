"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import {
  groupBySectionId,
  sectionName,
  shouldShowSections,
} from "@/lib/db/recipe-sections";
import type { RecipeIngredient, RecipeSection } from "@/lib/db/schema";
import { modifierLabel } from "@/lib/parse-recipe/modifiers";
import { unitLabel } from "@/lib/units";

interface IngredientsListProps {
  ingredients: RecipeIngredient[];
  sections?: RecipeSection[];
}

export function IngredientsList({
  ingredients,
  sections,
}: IngredientsListProps) {
  const t = useTranslations("recipes");
  const locale = useLocale() as Locale;

  const groups = groupBySectionId(ingredients, sections);
  const showSections = shouldShowSections(
    ingredients.map((ingredient) => ingredient.sectionId),
  );

  return (
    <div className="bg-[var(--glass-card-bg)] [backdrop-filter:var(--glass-card-blur)] [-webkit-backdrop-filter:var(--glass-card-blur)] border border-[var(--glass-card-border)] rounded-[20px]">
      <div className="px-[14px] py-3 border-b border-[var(--border-subtle)]">
        <h3 className="font-[family-name:var(--font-display)] text-[13px] font-bold text-[var(--fg-1)]">
          {t("ingredients")}
        </h3>
      </div>
      <ul>
        {groups.map((group, groupIndex) => {
          const name = group.sectionId
            ? sectionName(group.sectionId, sections)
            : t("mainSection");
          return (
            <li key={group.sectionId ?? `group-${groupIndex}`}>
              {showSections && name && (
                <div className="px-[14px] pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-2)]">
                  {name}
                </div>
              )}
              <ul>
                {group.items.map((ingredient, index) => (
                  <li
                    key={ingredient.id || `ing-${groupIndex}-${index}`}
                    className="flex items-center gap-[10px] px-[14px] py-[10px] border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#f59e0b]" />
                    <span className="text-[13px] text-[var(--fg-1)]">
                      {ingredient.amount && (
                        <span className="font-semibold">
                          {ingredient.amount}{" "}
                        </span>
                      )}
                      {ingredient.unit &&
                        `${unitLabel(ingredient.unit, locale)} `}
                      {ingredient.item}
                      {ingredient.modifiers?.map((modifier) => (
                        <span
                          key={modifier}
                          className="ml-2 inline-flex items-center rounded-full bg-[color-mix(in_oklch,var(--food-accent)_13%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--food-accent)]"
                        >
                          {modifierLabel(modifier, locale)}
                        </span>
                      ))}
                      {ingredient.original &&
                        ingredient.original !== ingredient.item && (
                          <span className="block text-[11px] text-[var(--fg-2)]">
                            {ingredient.original}
                          </span>
                        )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
