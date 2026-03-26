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
  const t = useTranslations("recipeForm");
  const tCommon = useTranslations("common");

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecipe(id)
      .then((recipe) => setRecipe(recipe ?? null))
      .finally(() => setLoading(false));
  }, [id]);

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
