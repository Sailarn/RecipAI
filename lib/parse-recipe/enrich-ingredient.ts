"use client";

import { isSignedIn } from "@/lib/auth/session-state";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS } from "@/lib/db/schema";
import { api } from "@/lib/routes";
import { getIngredientEmbeddings } from "./embed-client";
import { hasEmbedConsent } from "./embed-consent";

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
