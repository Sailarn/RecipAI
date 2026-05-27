"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageCentered } from "@/components/page-centered";
import { RecipeForm } from "@/components/recipe-form";
import type { ParsedRecipeData } from "@/components/recipe-form/default-values";

export default function NewRecipePage() {
  const tCommon = useTranslations("common");
  const [initialData, setInitialData] = useState<ParsedRecipeData | undefined>(
    undefined,
  );
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check for parsed recipe data in localStorage
    const stored = localStorage.getItem("parsedRecipe");

    if (stored) {
      try {
        const parsedRecipe = JSON.parse(stored) as ParsedRecipeData;
        setInitialData(parsedRecipe);
        // Clear it so it doesn't persist on page refresh
        localStorage.removeItem("parsedRecipe");
      } catch (caughtError) {
        setError(true);
        throw caughtError;
      }
    }

    // Mark as ready whether we found data or not
    setIsReady(true);
  }, []);

  // Don't render form until we've checked localStorage —
  // ensures RecipeForm gets the correct defaultValues on mount
  if (!isReady) {
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

  return (
    <div className="h-full">
      <RecipeForm initialData={initialData} />
    </div>
  );
}
