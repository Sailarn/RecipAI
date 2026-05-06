"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";

export default function EditRecipePage() {
  const params = useParams();
  const id = params.id as string;
  const tCommon = useTranslations("common");

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipe(id)
      .then((recipe) => setRecipe(recipe ?? null))
      .finally(() => setLoading(false));
  }, [id]);

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
