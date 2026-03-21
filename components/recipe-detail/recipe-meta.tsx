"use client";

import { useTranslations } from "next-intl";

interface RecipeMetaProps {
  servings: number;
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
}

export function RecipeMeta({
  servings,
  prepTime,
  cookTime,
  totalTime,
}: RecipeMetaProps) {
  const t = useTranslations("recipes");

  return (
    <div className="flex gap-6 mb-8 text-sm text-gray-600 dark:text-gray-400">
      <div>
        <span className="font-medium">{t("servings")}:</span> {servings}
      </div>
      {prepTime && (
        <div>
          <span className="font-medium">{t("prepTime")}:</span> {prepTime} min
        </div>
      )}
      {cookTime && (
        <div>
          <span className="font-medium">{t("cookTime")}:</span> {cookTime} min
        </div>
      )}
      {totalTime && (
        <div>
          <span className="font-medium">{t("totalTime")}:</span> {totalTime} min
        </div>
      )}
    </div>
  );
}
