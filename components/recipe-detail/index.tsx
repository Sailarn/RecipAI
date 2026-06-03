"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteRecipe, getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { isVideoUrl } from "@/lib/video-url";
import { CookingCarousel } from "../cooking-carousel";
import { ServingsCalculator } from "../servings-calculator";
import { TransitionLink } from "../transition-link";
import { CategoryBadge } from "./category-badge";
import { InstructionsList } from "./instructions-list";
import { RecipeHeader } from "./recipe-header";
import { RecipeHero } from "./recipe-hero";
import { RecipeMeta } from "./recipe-meta";

interface RecipeDetailProps {
  recipeId: string;
  locale: string;
}

export function RecipeDetail({ recipeId, locale }: RecipeDetailProps) {
  const navigate = useNavigate();
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);

  useEffect(() => {
    getRecipe(recipeId)
      .then((result) => setRecipe(result ?? null))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleDelete = async () => {
    await deleteRecipe(recipeId);
    navigate.back();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="w-full h-64 md:h-80 rounded-lg" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-4">
          <Skeleton className="h-16 w-24" />
          <Skeleton className="h-16 w-24" />
          <Skeleton className="h-16 w-24" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="mb-4 text-muted-foreground">
          {tRecipes("recipeNotFound")}
        </p>
        <TransitionLink
          href={routes.recipes.list(locale)}
          className="text-primary hover:underline"
        >
          {tRecipes("backToRecipes")}
        </TransitionLink>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      <div className="relative z-[20] shrink-0">
        <RecipeHeader
          locale={locale}
          recipeId={recipeId}
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

        <button
          type="button"
          onClick={() => setCookingMode(true)}
          className="w-full mb-2 p-[13px] rounded-[16px] bg-[#3b82f6] text-white font-sans text-[14px] font-bold cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.45)] tracking-[0.2px]"
        >
          Start Cooking
        </button>

        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full mb-6 p-[13px] rounded-[14px] bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)] backdrop-blur-[12px] text-[var(--fg-1)] font-sans text-sm font-medium text-center"
          >
            {isVideoUrl(recipe.sourceUrl) ? "Watch video" : "Source"}
          </a>
        )}

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
            onClose={() => setCookingMode(false)}
          />
        )}

        <AlertDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tRecipes("deleteConfirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tRecipes("deleteConfirmMessage")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
