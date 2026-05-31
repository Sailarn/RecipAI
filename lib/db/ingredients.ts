import { api } from "@/lib/routes";
import { syncFetch } from "@/lib/sync-fetch";
import { db } from "./db";
import { INGREDIENT_STATUS } from "./schema";

export async function createProvisionalIngredient(
  rawText: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.ingredients.add({
    id,
    en: rawText,
    ua: null,
    category: "Other",
    aliasesEn: [],
    aliasesUa: [],
    status: INGREDIENT_STATUS.PROVISIONAL,
    retryCount: 0,
    lastAttemptAt: null,
  });
  syncFetch(api.ingredientsEnrich, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, rawText }),
  });
  return id;
}
