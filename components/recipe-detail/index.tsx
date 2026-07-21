"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { isSignedIn } from "@/lib/auth/session-state";
import { pullOwnRecipe } from "@/lib/db/pull-own-recipe";
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
  initialRecipe?: Recipe;
}

export function RecipeDetail({
  recipeId,
  locale,
  publicRecipe,
  initialRecipe,
}: RecipeDetailProps) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const viewedRef = useRef(false);

  // Live-observe the recipe so background writes (e.g. ingredient normalization
  // completing after a parse) surface without a reload. initialRecipe seeds the
  // view so it paints instantly with no skeleton; the seed is also kept if the
  // row is gone locally, so only the deep-link/no-seed path falls through to the
  // private guard. `undefined` = still loading, `null` = confirmed not in Dexie.
  const liveRecipe = useLiveQuery(
    () => getRecipe(recipeId).then((result) => result ?? null),
    [recipeId],
  );
  const recipe: Recipe | null = liveRecipe ?? initialRecipe ?? null;
  const loading = liveRecipe === undefined && initialRecipe === undefined;

  // When the recipe isn't on this device, a signed-in user may still own it on
  // the server (a Telegram bot deep link opened before the full sync landed it).
  // Pull that one row directly instead of flashing the private guard; the live
  // query then re-renders it. `ownerPullDone` gates the guard so it only shows
  // once the pull has been attempted (or the user is signed out).
  const [ownerPullDone, setOwnerPullDone] = useState(false);
  const pullStartedRef = useRef(false);

  useEffect(() => {
    if (recipe || publicRecipe || !isSignedIn()) {
      setOwnerPullDone(true);
      return;
    }
    if (liveRecipe !== null || pullStartedRef.current) return;
    pullStartedRef.current = true;
    pullOwnRecipe(recipeId).finally(() => setOwnerPullDone(true));
  }, [recipe, publicRecipe, liveRecipe, recipeId]);

  useEffect(() => {
    if (recipe && !viewedRef.current) {
      viewedRef.current = true;
      trackEvent("recipe_viewed", { via: "list" });
    }
  }, [recipe]);

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
    if (isSignedIn() && !ownerPullDone) return <RecipeSkeleton />;
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
          sections={recipe.sections}
          canonicalIngredientIds={recipe.canonicalIngredientIds ?? undefined}
          locale={locale}
        />
        <InstructionsList
          instructions={recipe.instructions}
          sections={recipe.sections}
        />

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
