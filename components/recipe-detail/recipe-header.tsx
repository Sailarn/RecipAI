"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

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
      <Link
        href={`/${locale}/recipes`}
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {tRecipes("backToRecipes")}
      </Link>
      <div className="flex gap-2">
        <Link
          href={`/${locale}/recipes/${recipeId}/edit`}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
        >
          {t("edit")}
        </Link>
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
