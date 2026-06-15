"use client";

import { isSignedIn } from "@/lib/auth/session-state";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { syncUpdate } from "@/lib/db/supabase-sync";
import { api } from "@/lib/routes";
import { getIngredientEmbeddings } from "./embed-client";
import { hasEmbedConsent } from "./embed-consent";

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
    await contributeEmbedding(id, data.ingredient.en);
  }
}

// Compute the canonical entry's `passage:` embedding on-device and store it —
// locally so this device can match against it immediately, and on the server
// (write-once) so it reaches every other device via the vocab delta sync.
// Best-effort: silently skipped without model consent, never blocks enrichment.
async function contributeEmbedding(
  id: string,
  canonicalEn: string,
): Promise<void> {
  if (!hasEmbedConsent()) return;
  try {
    const [embedding] = await getIngredientEmbeddings([canonicalEn], "passage");
    if (!embedding) return;
    await db.ingredients.update(id, { embedding });
    await fetch(api.ingredient(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding }),
    });
  } catch {}
}
