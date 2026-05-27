"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageCentered } from "@/components/page-centered";
import { RecipeForm } from "@/components/recipe-form";
import { getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";

export default function EditRecipePage() {
  const params = useParams();
  const id = params.id as string;
  const tCommon = useTranslations("common");

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getRecipe(id)
      .then((fetchedRecipe) => setRecipe(fetchedRecipe ?? null))
      .catch((caughtError) => {
        setError(true);
        throw caughtError;
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageCentered>
        <p className="text-[var(--fg-3)]">{tCommon("loading")}</p>
      </PageCentered>
    );
  }

  if (error) {
    return (
      <PageCentered>
        <p className="text-[var(--fg-3)]">{tCommon("error")}</p>
      </PageCentered>
    );
  }

  if (!recipe) {
    return (
      <PageCentered>
        <p className="text-[var(--fg-3)]">{tCommon("recipeNotFound")}</p>
      </PageCentered>
    );
  }

  return (
    <div className="h-full">
      <RecipeForm key={recipe.id} recipe={recipe} />
    </div>
  );
}
