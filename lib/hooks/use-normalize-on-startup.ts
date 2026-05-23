"use client";

import { useEffect } from "react";
import { db } from "@/lib/db/db";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";

export function useNormalizeOnStartup() {
  useEffect(() => {
    db.recipes
      .filter((r) => !r.canonicalIngredientIds && r.ingredients.length > 0)
      .toArray()
      .then((pending) => {
        for (const recipe of pending) {
          normalizeRecipeIngredients(
            recipe.id,
            recipe.ingredients.map((ing) => ({ item: ing.item })),
          ).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);
}
