"use client";

import { useTranslations } from "next-intl";

export function RecipeEmptyState() {
  const t = useTranslations("recipes");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-[40px] text-center">
      <p className="text-[13px] text-[var(--fg-2)] leading-[1.8]">
        {t("noRecipes")}
      </p>
    </div>
  );
}
