"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";

interface RecipeEditViewProps {
  recipeId: string;
  locale: string;
}

// Prop-based edit view used when pushing onto the navigation stack.
// Accepts recipeId as a prop instead of useParams() so it works correctly
// after a history.pushState navigation where Next.js params are not updated.
export function RecipeEditView({ recipeId, locale }: RecipeEditViewProps) {
  const t = useTranslations("recipeForm");
  const tCommon = useTranslations("common");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipe(recipeId)
      .then((r) => setRecipe(r ?? null))
      .finally(() => setLoading(false));
  }, [recipeId]);

  if (loading) {
    return <div className="text-center py-12">{tCommon("loading")}</div>;
  }

  if (!recipe) {
    return <div className="text-center py-12">{tCommon("recipeNotFound")}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{t("editTitle")}</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
