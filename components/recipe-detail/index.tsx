"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { DeleteRecipeDialog } from "@/components/delete-recipe-dialog";
import { useDeleteRecipe } from "@/hooks/use-delete-recipe";
import { isSignedIn } from "@/lib/auth/session-state";
import { pullOwnRecipe } from "@/lib/db/pull-own-recipe";
import { getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { useAwaitingTelegramAutoSignIn } from "@/lib/hooks/use-awaiting-telegram-auto-sign-in";
import { fetchPublicRecipe } from "@/lib/public-recipes/fetch-public-recipe";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { routes } from "@/lib/routes";
import { trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { CookingCarousel } from "../cooking-carousel";
import { ServingsCalculator } from "../servings-calculator";
import { SharedRecipeDetail } from "../shared-recipe-detail";
import { PrivateRecipeGuard } from "../shared-recipe-detail/private-recipe-guard";
import { CategoryBadge } from "./category-badge";
import { InstructionsList } from "./instructions-list";
import { RecipeActions } from "./recipe-actions";
import { RecipeHeader } from "./recipe-header";
import { RecipeHero } from "./recipe-hero";
import { RecipeMeta } from "./recipe-meta";
import { RecipeSkeleton } from "./recipe-skeleton";
import { resolveOutcome, useResolutionOutcome } from "./use-resolution-outcome";

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
  const deleteWithUndo = useDeleteRecipe();
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

  // When the recipe isn't on this device, two independent checks decide what
  // to show — a Telegram deep link pushes this view with no server-fetched
  // `publicRecipe` the way a fresh page load has, so both run client-side.
  //
  // 1. Is it public? No login required — this is the only check a genuine
  //    share needs, so it runs immediately and unconditionally.
  // 2. If not, is it the signed-in user's own recipe, just not synced to this
  //    device yet (a bot deep link opened before the full sync landed it)?
  //    This one does need auth to have settled, so it waits its turn.
  //
  // Keeping these separate matters: the public check must never be blocked on
  // sign-in resolving, or a stuck/slow Telegram auto sign-in turns a plain
  // public share into an infinite skeleton.
  const [publicCheckDone, setPublicCheckDone] = useState(false);
  const [fetchedPublicRecipe, setFetchedPublicRecipe] =
    useState<PublicRecipe | null>(null);
  const publicCheckStartedRef = useRef(false);
  const effectivePublicRecipe = publicRecipe ?? fetchedPublicRecipe;

  const [ownerPullDone, setOwnerPullDone] = useState(false);
  const ownerPullStartedRef = useRef(false);

  // isSignedIn() is a plain module flag set from useSyncOnLogin's session
  // effect — on a cold Telegram launch it reads false for the brief window
  // before the silent Telegram auto sign-in resolves.
  const awaitingTelegramAutoSignIn = useAwaitingTelegramAutoSignIn(
    isSignedIn(),
  );

  useEffect(() => {
    if (recipe || effectivePublicRecipe) {
      setPublicCheckDone(true);
      return;
    }
    if (liveRecipe !== null || publicCheckStartedRef.current) return;
    publicCheckStartedRef.current = true;
    fetchPublicRecipe(recipeId)
      .then((shared) => {
        if (shared) setFetchedPublicRecipe(shared);
      })
      .finally(() => setPublicCheckDone(true));
  }, [recipe, effectivePublicRecipe, liveRecipe, recipeId]);

  useEffect(() => {
    if (!publicCheckDone || recipe || effectivePublicRecipe) return;
    if (awaitingTelegramAutoSignIn) return;
    if (!isSignedIn()) {
      setOwnerPullDone(true);
      return;
    }
    if (liveRecipe !== null || ownerPullStartedRef.current) return;
    ownerPullStartedRef.current = true;
    pullOwnRecipe(recipeId).finally(() => setOwnerPullDone(true));
  }, [
    publicCheckDone,
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

  // recipe_viewed above only covers the Dexie branch. This covers every
  // terminal state — including the share path, which reported nothing at all,
  // so a shared recipe that hung looked exactly like one that rendered fine.
  useResolutionOutcome(
    resolveOutcome({
      loading,
      hasRecipe: Boolean(recipe),
      hasPublicRecipe: Boolean(effectivePublicRecipe),
      publicCheckDone,
      ownerPullDone,
      awaitingTelegramAutoSignIn,
    }),
  );

  const handleDelete = async () => {
    // Leave the detail view first: the toast (and its Undo) belongs on the
    // list the user lands back on, not on a view of a recipe that is gone.
    navigate.back();
    await deleteWithUndo(recipeId);
  };

  if (loading) {
    return <RecipeSkeleton />;
  }

  if (!recipe) {
    if (effectivePublicRecipe)
      return (
        <SharedRecipeDetail
          locale={locale}
          recipe={effectivePublicRecipe}
          onSaved={(savedId) =>
            navigate.replace(
              routes.recipes.detail(locale, savedId),
              <RecipeDetail recipeId={savedId} locale={locale} />,
            )
          }
        />
      );
    if (!publicCheckDone) return <RecipeSkeleton />;
    if (awaitingTelegramAutoSignIn || !ownerPullDone) return <RecipeSkeleton />;
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

        <DeleteRecipeDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
