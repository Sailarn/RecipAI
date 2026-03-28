"use client";

import { useTranslations } from "next-intl";
import { TransitionLink } from "../transition-link";

interface RecipeHeaderProps {
  locale: string;
  recipeId: string;
  onDeleteClick: () => void;
}

export function RecipeHeader({
  locale,
  recipeId,
  onDeleteClick,
}: RecipeHeaderProps) {
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");

  return (
    <div className="flex items-center justify-between mb-6">
      <TransitionLink
        href={`/${locale}/recipes`}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {tRecipes("backToRecipes")}
      </TransitionLink>
      <div className="flex gap-2">
        <TransitionLink
          href={`/${locale}/recipes/${recipeId}/edit`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
        >
          {t("edit")}
        </TransitionLink>
        <button
          type="button"
          onClick={onDeleteClick}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
}
