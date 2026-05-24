import { api } from "@/lib/routes";
import { db } from "./db";

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
    status: "provisional",
    retryCount: 0,
    lastAttemptAt: null,
  });
  fetch(api.ingredientsEnrich, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, rawText }),
  }).catch(() => {});
  return id;
}
