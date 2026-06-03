"use client";

import { useEffect } from "react";
import { db } from "@/lib/db/db";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";

export function useNormalizeOnStartup() {
  useEffect(() => {
    db.recipes
      .filter(
        (recipe) =>
          !recipe.canonicalIngredientIds && recipe.ingredients.length > 0,
      )
      .toArray()
      .then((pending) => {
        for (const recipe of pending) {
          normalizeRecipeIngredients(
            recipe.id,
            recipe.ingredients.map((ingredient) => ({ item: ingredient.item })),
          ).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);
}
