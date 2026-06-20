import type { ParsedRecipe } from "@/lib/db/schema";
import { log } from "@/lib/telemetry";

export interface NotRecipeResult {
  notRecipe: true;
}

export type RecipeExtractionResult = ParsedRecipe | NotRecipeResult;

type RecipeSource = "page" | "photo";

type IncompleteReason = "not_recipe" | "no_ingredients" | "no_instructions";

interface IncompleteContext {
  // Present at the queue boundary (process/photo routes); the in-pipeline
  // parsers identify the input by URL instead.
  jobId?: string;
  // Source URL for page/video parses; null for photos (no link to re-run).
  url?: string | null;
}

// Log every rejected extraction with enough context to deep-dive a single
// failure — not just count them. `url` + `jobId` identify and reproduce the
// input; `result` carries exactly what the model returned (a failed job never
// persists its result, so this log is the only record of it). Ships to Axiom
// server-side regardless of telemetry consent.
function rejectIncomplete(
  source: RecipeSource,
  reason: IncompleteReason,
  fields: Record<string, unknown>,
): never {
  log("warn", "parse_incomplete", { source, reason, ...fields });
  throw new Error(`Couldn't extract a recipe from this ${source}`);
}

export function requireCompleteRecipe(
  result: RecipeExtractionResult,
  source: RecipeSource,
  context: IncompleteContext,
): ParsedRecipe {
  const base: Record<string, unknown> = { url: context.url ?? null };
  if (context.jobId) base.jobId = context.jobId;

  if ("notRecipe" in result) rejectIncomplete(source, "not_recipe", base);

  const ingredientCount = Array.isArray(result.ingredients)
    ? result.ingredients.length
    : 0;
  const instructionCount = Array.isArray(result.instructions)
    ? result.instructions.length
    : 0;
  const details = {
    ...base,
    title: result.title ?? null,
    ingredientCount,
    instructionCount,
    result,
  };

  if (ingredientCount === 0) {
    rejectIncomplete(source, "no_ingredients", details);
  }
  if (instructionCount === 0) {
    rejectIncomplete(source, "no_instructions", details);
  }

  return result;
}
