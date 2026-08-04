"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { RECIPE_CATEGORIES, type RecipeCategory } from "@/lib/categories";

function isKnownCategory(value: string): value is RecipeCategory {
  return (RECIPE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Display label for a recipe category.
 *
 * The stored value stays English on purpose — it's a fixed enum that lives in
 * Dexie and Postgres and is named in the AI parse prompt, so translating it at
 * the data layer would change what the model is asked for and what older rows
 * mean. Only the label is localised.
 *
 * Anything not in the enum (older or hand-edited rows) falls through unchanged
 * rather than throwing on a missing message.
 */
export function useCategoryLabel() {
  const t = useTranslations("categories");

  return useCallback(
    (category: string | null | undefined): string => {
      if (!category) return "";
      return isKnownCategory(category) ? t(category) : category;
    },
    [t],
  );
}
