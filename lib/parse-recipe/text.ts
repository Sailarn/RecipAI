import { apiFetch } from "@/lib/api/api-fetch";
import type { ParsedRecipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";

// Same budget as a scraped page: plenty for any single recipe, and it caps
// what one request can spend on the model.
export const MAX_RECIPE_TEXT_CHARS = 25000;
// Anything shorter can't hold both an ingredient list and a step.
export const MIN_RECIPE_TEXT_CHARS = 20;

export async function parseRecipeFromText(
  text: string,
  jobId: string,
): Promise<ParsedRecipe> {
  const res = await apiFetch(api.parseRecipeText, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, jobId }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
    throw new Error(error || "Parse failed");
  }

  return res.json() as Promise<ParsedRecipe>;
}
