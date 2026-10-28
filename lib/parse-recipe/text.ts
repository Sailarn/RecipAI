import { apiFetch } from "@/lib/api/api-fetch";
import type { ParsedRecipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";

// Same budget as a scraped page, and the one knob for the pasted-text limit
// (web text tab and the bot's /parse_text). Measured 2026-10-28 on saved
// recipes: title + ingredients + steps average ~870 characters, longest ~4.6k.
// Pasted text also carries blog prose or a chat answer's preamble, so this
// leaves ~5x room over the longest recipe while capping what one request can
// spend on the model.
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
