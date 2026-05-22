"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeImage } from "@/components/recipe-image";
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
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { isVideoUrl } from "@/lib/video-url";
import { CookingCarousel } from "../cooking-carousel";
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
  const [syncing, setSyncing] = useState(false);

  const handleSyncIngredients = async () => {
    if (!recipe) return;
    setSyncing(true);
    try {
      await normalizeRecipeIngredients(
        recipe.id,
        recipe.ingredients.map((ing) => ({ item: ing.item })),
      );
      const updated = await getRecipe(recipe.id);
      if (updated) setRecipe(updated);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    getRecipe(recipeId)
      .then((recipe) => setRecipe(recipe ?? null))
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
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
      }}
    >
      {/* Nav row - rendered by RecipeHeader which now has its own padding */}
      <div style={{ position: "relative", zIndex: 20, flexShrink: 0 }}>
        <RecipeHeader
          locale={locale}
          recipeId={recipeId}
          onDeleteClick={() => setShowDeleteConfirm(true)}
        />
      </div>

      {/* Scrollable content area - pulls up under nav for hero bleed */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          marginTop: "-72px",
          padding: "0 14px 40px",
          userSelect: "text",
          WebkitUserSelect: "text",
        }}
      >
        {/* Hero gradient + emoji fallback */}
        <div
          style={{
            height: 210,
            flexShrink: 0,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            paddingTop: 72,
            borderRadius: 0,
            overflow: "hidden",
          }}
        >
          {recipe.imageUrl ? (
            <RecipeImage
              imageUrl={recipe.imageUrl}
              title={recipe.title}
              width={800}
              sizes="100vw"
              priority
              objectPosition={`${recipe.imageFocusX ?? 50}% ${recipe.imageFocusY ?? 50}%`}
              imageCropX={recipe.imageCropX}
              imageCropY={recipe.imageCropY}
              imageCropWidth={recipe.imageCropWidth}
              imageCropHeight={recipe.imageCropHeight}
            />
          ) : (
            <span>{"🍽️"}</span>
          )}
          {/* Bottom fade overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              background:
                "linear-gradient(to bottom, transparent, var(--bg-base))",
              pointerEvents: "none",
            }}
          />
        </div>

        <div className="flex items-start justify-between gap-2 mb-4">
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-extrabold)",
              lineHeight: "var(--leading-tight)",
              color: "var(--fg-1)",
              flex: 1,
            }}
          >
            {recipe.title}
          </h1>
          {recipe.category &&
            (() => {
              const BADGE: Record<string, { bg: string; color: string }> = {
                Breakfast: { bg: "rgba(232,89,12,0.22)", color: "#fdba74" },
                Lunch: { bg: "rgba(47,158,68,0.22)", color: "#86efac" },
                Dinner: { bg: "rgba(59,91,219,0.22)", color: "#93c5fd" },
                Soup: { bg: "rgba(234,88,12,0.22)", color: "#fb923c" },
                Salad: { bg: "rgba(47,158,68,0.22)", color: "#86efac" },
                Snack: { bg: "rgba(139,92,246,0.22)", color: "#c4b5fd" },
                Dessert: { bg: "rgba(194,37,92,0.22)", color: "#f9a8d4" },
                Baking: { bg: "rgba(234,179,8,0.22)", color: "#fde047" },
                Drink: { bg: "rgba(6,182,212,0.22)", color: "#67e8f9" },
                Other: { bg: "rgba(100,100,110,0.22)", color: "#d4d4d8" },
              };
              const b = BADGE[recipe.category] ?? BADGE.Other;
              return (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 99,
                    background: b.bg,
                    color: b.color,
                    border: `1px solid ${b.color}30`,
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                >
                  {recipe.category}
                </span>
              );
            })()}
        </div>

        {recipe.description && (
          <p className="mb-4 text-sm" style={{ color: "var(--fg-2)" }}>
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
          className="w-full mb-2"
          style={{
            padding: "13px",
            borderRadius: 16,
            background: "#3b82f6",
            border: "none",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(59,130,246,0.45)",
            letterSpacing: "0.2px",
          }}
        >
          Start Cooking
        </button>
        {recipe.sourceUrl && (
          <button
            type="button"
            onClick={() => window.open(recipe.sourceUrl, "_blank")}
            className="w-full mb-6"
            style={{
              padding: "13px",
              borderRadius: 14,
              background: "rgba(255,170,50,0.08)",
              border: "1px solid rgba(255,200,100,0.18)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "var(--fg-1)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: "var(--font-medium)",
              cursor: "pointer",
            }}
          >
            {isVideoUrl(recipe.sourceUrl) ? "Watch video" : "Source"}
          </button>
        )}
        {(recipe.canonicalIngredientIds ?? []).length === 0 && (
          <button
            type="button"
            onClick={handleSyncIngredients}
            disabled={syncing}
            className="w-full mb-2"
            style={{
              padding: "11px",
              borderRadius: 14,
              background: "rgba(255,170,50,0.06)",
              border: "1px solid rgba(255,200,100,0.18)",
              color: syncing ? "var(--fg-3)" : "var(--fg-2)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              cursor: syncing ? "default" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {syncing ? "Matching ingredients…" : "Sync ingredients"}
          </button>
        )}
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
