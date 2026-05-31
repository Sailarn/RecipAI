"use client";

import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { api } from "@/lib/routes";
import { isSignedIn } from "@/lib/session-state";

type EnrichResponse = {
  success: boolean;
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
  if (data.ingredient) {
    await db.ingredients.update(id, {
      ...data.ingredient,
      status: INGREDIENT_STATUS.CONFIRMED,
    });
  }
}
