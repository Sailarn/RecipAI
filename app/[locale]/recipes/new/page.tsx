"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  const t = useTranslations("recipeForm");
  const [initialData, setInitialData] = useState<any>(undefined);
  const [isReady, setIsReady] = useState(false);

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
      <RecipeForm initialData={initialData} />
    </div>
  );
}
