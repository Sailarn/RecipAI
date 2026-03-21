"use client";
import { useTranslations } from "next-intl";
import type { Ingredient } from "@/lib/db/schema";

interface IngredientsListProps {
  ingredients: Ingredient[];
}

export function IngredientsList({ ingredients }: IngredientsListProps) {
  const t = useTranslations("recipes");

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{t("ingredients")}</h2>
      <ul className="space-y-2">
        {ingredients.map((ingredient) => (
          <li key={ingredient.id} className="flex gap-2">
            <span className="text-gray-600 dark:text-gray-400">•</span>
            <span>
              {ingredient.amount && `${ingredient.amount} `}
              {ingredient.unit && `${ingredient.unit} `}
              {ingredient.item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
