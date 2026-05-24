import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo } from "react";
import { db } from "@/lib/db/db";
import type { Recipe } from "@/lib/db/schema";

export function useRecipeMatcher() {
  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []);

  const pantrySet = useMemo(
    () =>
      new Set(
        (pantryItems ?? [])
          .filter((p) => p.on && p.ingredientId)
          .map((p) => p.ingredientId as string),
      ),
    [pantryItems],
  );

  const getMissing = useCallback(
    (recipe: Recipe): number | null => {
      const ids = recipe.canonicalIngredientIds;
      if (!ids || ids.length === 0) return null;
      return ids.filter((id) => !pantrySet.has(id)).length;
    },
    [pantrySet],
  );

  return { pantrySet, getMissing };
}
