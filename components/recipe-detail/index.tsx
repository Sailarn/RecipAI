"use client";

import { useEffect, useState } from "react";
import { deleteRecipe, getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { CookingCarousel } from "../cooking-carousel";
import { ServingsCalculator } from "../servings-calculator";
import { SharedRecipeDetail } from "../shared-recipe-detail";
import { PrivateRecipeGuard } from "../shared-recipe-detail/private-recipe-guard";
import { CategoryBadge } from "./category-badge";
import { DeleteDialog } from "./delete-dialog";
import { InstructionsList } from "./instructions-list";
import { RecipeActions } from "./recipe-actions";
import { RecipeHeader } from "./recipe-header";
import { RecipeHero } from "./recipe-hero";
import { RecipeMeta } from "./recipe-meta";
import { RecipeSkeleton } from "./recipe-skeleton";

interface RecipeDetailProps {
  recipeId: string;
  locale: string;
  publicRecipe?: PublicRecipe | null;
}

export function RecipeDetail({
  recipeId,
  locale,
  publicRecipe,
}: RecipeDetailProps) {
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);

  useEffect(() => {
    getRecipe(recipeId)
      .then((result) => {
        setRecipe(result ?? null);
        if (result) trackEvent("recipe_viewed", { via: "list" });
      })
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleDelete = async () => {
    trackEvent("recipe_deleted", undefined);
    await deleteRecipe(recipeId);
    navigate.back();
  };

  if (loading) {
    return <RecipeSkeleton />;
  }

  if (!recipe) {
    if (publicRecipe)
      return <SharedRecipeDetail locale={locale} recipe={publicRecipe} />;
    return <PrivateRecipeGuard locale={locale} />;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      <div className="relative z-[20] shrink-0">
        <RecipeHeader
          locale={locale}
          recipeId={recipeId}
          recipe={recipe}
          onDeleteClick={() => setShowDeleteConfirm(true)}
        />
      </div>

      <div className="relative z-[1] flex-1 overflow-y-auto -mt-[72px] px-[14px] pb-[40px] select-text">
        <RecipeHero recipe={recipe} />

        <div className="flex items-start justify-between gap-2 mb-4">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold leading-tight text-[var(--fg-1)] flex-1">
            {recipe.title}
          </h1>
          {recipe.category && <CategoryBadge category={recipe.category} />}
        </div>

        {recipe.description && (
          <p className="mb-4 text-sm text-[var(--fg-2)]">
            {recipe.description}
          </p>
        )}

        <RecipeMeta
          prepTime={recipe.prepTime}
          cookTime={recipe.cookTime}
          totalTime={recipe.totalTime}
        />

        <RecipeActions
          sourceUrl={recipe.sourceUrl}
          onStartCooking={() => setCookingMode(true)}
        />

        <ServingsCalculator
          originalServings={recipe.servings}
          ingredients={recipe.ingredients}
          canonicalIngredientIds={recipe.canonicalIngredientIds ?? undefined}
          locale={locale}
        />
        <InstructionsList instructions={recipe.instructions} />

        {cookingMode && (
          <CookingCarousel
            recipe={recipe}
            locale={locale}
            onClose={() => setCookingMode(false)}
          />
        )}

        <DeleteDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
