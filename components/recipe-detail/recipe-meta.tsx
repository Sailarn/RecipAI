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
  const tCommon = useTranslations("common");

  const items = [
    { label: t("servings"), value: String(servings) },
    prepTime
      ? { label: t("prepTime"), value: `${prepTime} ${tCommon("minutes")}` }
      : null,
    cookTime
      ? { label: t("cookTime"), value: `${cookTime} ${tCommon("minutes")}` }
      : null,
    totalTime
      ? { label: t("totalTime"), value: `${totalTime} ${tCommon("minutes")}` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex gap-6 mb-8 text-sm text-muted-foreground">
      {items.map((item, i) => (
        <div key={item.label}>
          <span className="font-medium text-foreground">{item.label}:</span>{" "}
          {item.value}
        </div>
      ))}
    </div>
  );
}
