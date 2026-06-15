import { useCallback, useMemo } from "react";
import { useLiveQueryTransition } from "@/hooks/use-live-query-transition";
import { db } from "@/lib/db/db";
import type { Recipe } from "@/lib/db/schema";

export function useRecipeMatcher() {
  const pantryItems = useLiveQueryTransition(() => db.pantry.toArray(), []);

  const pantrySet = useMemo(
    () =>
      new Set(
        (pantryItems ?? [])
          .filter((pantryItem) => pantryItem.on && pantryItem.ingredientId)
          .map((pantryItem) => pantryItem.ingredientId as string),
      ),
    [pantryItems],
  );

  const getMissing = useCallback(
    (recipe: Recipe): { missing: number; total: number } | null => {
      // canonicalIngredientIds is index-aligned with ingredients, so drop the
      // "" placeholder slots before counting.
      const ids = (recipe.canonicalIngredientIds ?? []).filter(Boolean);
      if (ids.length === 0) return null;
      return {
        missing: ids.filter((id) => !pantrySet.has(id)).length,
        total: ids.length,
      };
    },
    [pantrySet],
  );

  return { pantrySet, getMissing };
}
