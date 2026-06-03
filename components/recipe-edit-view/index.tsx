"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";

interface RecipeEditViewProps {
  recipeId: string;
}

// uses props not useParams() — pushState nav doesn't update Next.js params
export function RecipeEditView({ recipeId }: RecipeEditViewProps) {
  const tCommon = useTranslations("common");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipe(recipeId)
      .then((result) => setRecipe(result ?? null))
      .finally(() => setLoading(false));
  }, [recipeId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--fg-3)]">{tCommon("loading")}</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--fg-3)]">{tCommon("recipeNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <RecipeForm key={recipe.id} recipe={recipe} />
    </div>
  );
}
