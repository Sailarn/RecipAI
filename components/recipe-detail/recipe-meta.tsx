"use client";

import { useTranslations } from "next-intl";

interface RecipeMetaProps {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
}

export function RecipeMeta({ prepTime, cookTime, totalTime }: RecipeMetaProps) {
  const tCommon = useTranslations("common");
  const t = useTranslations("recipes");

  const items = [
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

  if (items.length === 0) return null;

  return (
    <div className="flex gap-6 mb-4 text-sm text-muted-foreground">
      {items.map((item) => (
        <div key={item.label}>
          <span className="font-medium text-foreground">{item.label}:</span>{" "}
          {item.value}
        </div>
      ))}
    </div>
  );
}
