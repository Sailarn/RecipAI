import { callAiForRecipe } from "@/lib/ai";
import { buildTextPrompt } from "@/lib/parse-recipe/prompts";
import type { RecipeExtractionResult } from "@/lib/parse-recipe/recipe-result";
import { MAX_RECIPE_TEXT_CHARS } from "@/lib/parse-recipe/text";
import { log } from "@/lib/telemetry";

const LINK_ONLY = /^\s*(https?:\/\/\S+\s*)+$/i;
// Below this share of letters among visible characters the text is code, an
// encoded blob or symbol noise rather than prose.
const MIN_LETTER_SHARE = 0.5;
const MIN_LIST_LINES = 2;
const MIN_LINES = 3;
const LIST_LINE = /^\s*([-•*–]|\d+[.)])\s/;

/**
 * A cheap gate in front of the model: rejects pasted text that cannot be a
 * recipe, so it never costs an AI call. Deliberately lenient — a recipe has an
 * amount, a time or a temperature (a digit), list lines, or at least a few
 * lines; the model's own not-a-recipe check catches everything subtler.
 */
export function looksLikeRecipeText(text: string): boolean {
  if (LINK_ONLY.test(text)) return false;

  const visible = text.replace(/\s/g, "");
  const letterCount = visible.match(/\p{L}/gu)?.length ?? 0;
  if (letterCount < visible.length * MIN_LETTER_SHARE) return false;

  const lines = text.split("\n").filter((line) => line.trim() !== "");
  const listLineCount = lines.filter((line) => LIST_LINE.test(line)).length;
  return (
    /\d/.test(text) ||
    listLineCount >= MIN_LIST_LINES ||
    lines.length >= MIN_LINES
  );
}

/** Pasted text → model extraction, behind the `looksLikeRecipeText` gate. */
export async function extractRecipeFromText(
  text: string,
): Promise<RecipeExtractionResult> {
  if (!looksLikeRecipeText(text)) {
    log("warn", "parse_text_rejected", { chars: text.length });
    return { notRecipe: true };
  }
  return callAiForRecipe(buildTextPrompt(text.slice(0, MAX_RECIPE_TEXT_CHARS)));
}
