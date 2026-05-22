"use client";

import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import type { ParsedRecipeData } from "@/components/recipe-form/default-values";

export default function NewRecipePage() {
  const [initialData, setInitialData] = useState<ParsedRecipeData | undefined>(
    undefined,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check for parsed recipe data in localStorage
    const stored = localStorage.getItem("parsedRecipe");

    if (stored) {
      try {
        const parsedRecipe = JSON.parse(stored);
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
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--fg-3)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <RecipeForm initialData={initialData} />
    </div>
  );
}
