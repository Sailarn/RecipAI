"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { isSignedIn } from "@/lib/auth/session-state";
import { pullOwnRecipe } from "@/lib/db/pull-own-recipe";
import { deleteRecipe, getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { useAwaitingTelegramAutoSignIn } from "@/lib/hooks/use-awaiting-telegram-auto-sign-in";
import { fetchPublicRecipe } from "@/lib/public-recipes/fetch-public-recipe";
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

  // When the recipe isn't on this device, it's resolved one of two ways before
  // falling back to the private guard: a signed-in user may still own it on
  // the server (a Telegram bot deep link opened before the full sync landed
  // it) — pull that row directly, the live query then re-renders it. If it
  // isn't theirs (or they're signed out), it may be a recipe someone else
  // shared publicly — e.g. opening a shared-recipe deep link while already
  // signed in to a different account, which never carries a server
  // `publicRecipe` prop the way a fresh page load does. `resolutionDone` gates
  // the guard so it only shows once both have been tried.
  const [resolutionDone, setResolutionDone] = useState(false);
  const [fetchedPublicRecipe, setFetchedPublicRecipe] =
    useState<PublicRecipe | null>(null);
  const resolutionStartedRef = useRef(false);
  const effectivePublicRecipe = publicRecipe ?? fetchedPublicRecipe;

  // isSignedIn() is a plain module flag set from useSyncOnLogin's session
  // effect — on a cold Telegram launch it reads false for the brief window
  // before the silent Telegram auto sign-in resolves, which used to fall
  // straight through to the private guard instead of waiting.
  const awaitingTelegramAutoSignIn = useAwaitingTelegramAutoSignIn(
    isSignedIn(),
  );

  useEffect(() => {
    if (recipe || effectivePublicRecipe) {
      setResolutionDone(true);
      return;
    }
    if (awaitingTelegramAutoSignIn) return;
    if (liveRecipe !== null || resolutionStartedRef.current) return;
    resolutionStartedRef.current = true;

    (async () => {
      if (isSignedIn()) {
        const owned = await pullOwnRecipe(recipeId);
        if (owned) return;
      }
      const shared = await fetchPublicRecipe(recipeId);
      if (shared) setFetchedPublicRecipe(shared);
    })().finally(() => setResolutionDone(true));
  }, [
    recipe,
    effectivePublicRecipe,
    liveRecipe,
    recipeId,
    awaitingTelegramAutoSignIn,
  ]);

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
    if (effectivePublicRecipe)
      return (
        <SharedRecipeDetail locale={locale} recipe={effectivePublicRecipe} />
      );
    if (awaitingTelegramAutoSignIn || !resolutionDone)
      return <RecipeSkeleton />;
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
