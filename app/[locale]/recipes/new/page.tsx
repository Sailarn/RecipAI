"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AIImportButton } from "@/components/ai-import-button";
import { RecipeForm } from "@/components/recipe-form";
import type { ParsedRecipeData } from "@/components/recipe-form/default-values";
import { TransitionLink } from "@/components/transition-link";
import { routes } from "@/lib/routes";

export default function NewRecipePage() {
  const t = useTranslations("recipeForm");
  const [initialData, setInitialData] = useState<ParsedRecipeData | undefined>(
    undefined,
  );
  const tRecipes = useTranslations("recipes");
  const [isReady, setIsReady] = useState(false);
  const params = useParams();
  const locale = params.locale as string;

  useEffect(() => {
    // Check for parsed recipe data in localStorage
    const stored = localStorage.getItem("parsedRecipe");

    if (stored) {
      try {
        const parsedRecipe = JSON.parse(stored);
        console.log("✅ Loaded parsed recipe:", parsedRecipe.title);
        setInitialData(parsedRecipe);

        // Clear it so it doesn't persist on page refresh
        localStorage.removeItem("parsedRecipe");
      } catch (err) {
        console.error("❌ Failed to parse recipe data:", err);
      }
    }

    // Mark as ready whether we found data or not
    setIsReady(true);
  }, []);

  // Don't render form until we've checked localStorage
  // This ensures RecipeForm gets the correct defaultValues on mount
  if (!isReady) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">{t("createTitle")}</h1>
        <div className="text-center py-8">
          <p className="text-[var(--muted-foreground)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{t("createTitle")}</h1>
      <div className="flex items-center justify-between mb-6">
        <TransitionLink
          href={routes.recipes.list(locale)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {tRecipes("backToRecipes")}
        </TransitionLink>
      </div>
      <div className="mb-6">
        <AIImportButton />
      </div>
      <RecipeForm initialData={initialData} />
    </div>
  );
}
