"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import type { ParsedRecipeData } from "@/components/recipe-form/default-values";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeNewViewProps {
  locale: string;
}

export function RecipeNewView({ locale }: RecipeNewViewProps) {
  const t = useTranslations("recipeForm");
  const tRecipes = useTranslations("recipes");
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<ParsedRecipeData | undefined>(
    undefined,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("parsedRecipe");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setInitialData(parsed);
        localStorage.removeItem("parsedRecipe");
      } catch {
        // ignore malformed data
      }
    }
    setIsReady(true);
  }, []);

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{t("createTitle")}</h1>
        <button
          type="button"
          onClick={() => navigate.back()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {tRecipes("backToRecipes")}
        </button>
      </div>
      <RecipeForm initialData={initialData} />
    </div>
  );
}
