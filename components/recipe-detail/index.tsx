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
import { CookingCarousel } from "../cooking-carousel";
import { RecipeImage } from "../recipe-image";
import { ServingsCalculator } from "../servings-calculator";
import { TransitionLink } from "../transition-link";
import { InstructionsList } from "./instructions-list";
import { RecipeHeader } from "./recipe-header";
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
      .then((recipe) => setRecipe(recipe ?? null))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleDelete = async () => {
    await deleteRecipe(recipeId);
    navigate.push(routes.recipes.list(locale));
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
        <p className="mb-4" style={{ color: "var(--muted-foreground)" }}>
          {tRecipes("recipeNotFound")}
        </p>
        <TransitionLink
          href={routes.recipes.list(locale)}
          className="hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {tRecipes("backToRecipes")}
        </TransitionLink>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <RecipeHeader
        locale={locale}
        recipeId={recipeId}
        onDeleteClick={() => setShowDeleteConfirm(true)}
      />

      <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-lg mb-6">
        <RecipeImage
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          sizes="100vw"
          width={800}
          height={320}
        />
      </div>

      <h1 className="text-4xl font-bold mb-4">{recipe.title}</h1>

      {recipe.description && (
        <p className="mb-6" style={{ color: "var(--muted-foreground)" }}>
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
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium mb-6 hover:bg-primary/90 transition-colors"
      >
        Start Cooking
      </button>
      <ServingsCalculator
        originalServings={recipe.servings}
        ingredients={recipe.ingredients}
      />
      <InstructionsList instructions={recipe.instructions} />
      {cookingMode && (
        <CookingCarousel
          recipe={recipe}
          onClose={() => setCookingMode(false)}
        />
      )}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
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
  );
}
