import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
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

  function getMissing(recipe: Recipe): number | null {
    const ids = recipe.canonicalIngredientIds;
    if (!ids || ids.length === 0) return null;
    return ids.filter((id) => !pantrySet.has(id)).length;
  }

  return { pantrySet, getMissing };
}
