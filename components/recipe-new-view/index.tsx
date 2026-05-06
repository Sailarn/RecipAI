"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeForm } from "@/components/recipe-form";
import type { ParsedRecipeData } from "@/components/recipe-form/default-values";

interface RecipeNewViewProps {
  locale: string;
}

export function RecipeNewView({ locale }: RecipeNewViewProps) {
  const t = useTranslations("recipeForm");
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
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--fg-3)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%" }}>
      <RecipeForm initialData={initialData} />
    </div>
  );
}
