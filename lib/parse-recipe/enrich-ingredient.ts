"use client";

import { isSignedIn } from "@/lib/auth/session-state";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { syncUpdate } from "@/lib/db/supabase-sync";
import { api } from "@/lib/routes";

type EnrichResponse = {
  success: boolean;
  mergedInto?: string;
  ingredient?: {
    en: string;
    ua: string;
    category: string;
    aliasesEn: string[];
    aliasesUa: string[];
  };
};

export async function enrichIngredient(
  id: string,
  rawText: string,
  ua?: string | null,
  category?: string | null,
): Promise<void> {
  if (!isSignedIn()) return;
  const res = await fetch(api.ingredientsEnrich, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, rawText, ua, category }),
  });
  if (!res.ok) return;
  const data = (await res.json()) as EnrichResponse;

  if (data.mergedInto) {
    const canonicalId = data.mergedInto;

    await db.pantry
      .where("ingredientId")
      .equals(id)
      .modify({ ingredientId: canonicalId });

    const affectedRecipes = await db.recipes
      .filter((recipe) => recipe.canonicalIngredientIds?.includes(id) ?? false)
      .toArray();

    for (const recipe of affectedRecipes) {
      const canonicalIngredientIds = recipe.canonicalIngredientIds?.map(
        (cid) => (cid === id ? canonicalId : cid),
      );
      const updatedAt = new Date();
      await db.recipes.update(recipe.id, { canonicalIngredientIds, updatedAt });
      syncUpdate(recipe.id, { canonicalIngredientIds, updatedAt });
    }

    await db.ingredients.delete(id);
    return;
  }

  if (data.ingredient) {
    await db.ingredients.update(id, {
      ...data.ingredient,
      status: INGREDIENT_STATUS.CONFIRMED,
    });
  }
}
