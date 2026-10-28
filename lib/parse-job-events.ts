import type { ParsedRecipe } from "@/lib/db/schema";

// Fired once a parse job has an outcome — the recipe is saved, or it failed —
// so the parse page can show it for the job it is following.
export const PARSE_JOB_SETTLED_EVENT = "parse-job-settled";

export type ParseJobSettledDetail =
  | {
      jobId: string;
      status: "done";
      recipeId: string;
      recipe: ParsedRecipe;
      alreadySaved: boolean;
    }
  | { jobId: string; status: "failed"; reason: string };

export function dispatchParseJobSettled(detail: ParseJobSettledDetail): void {
  window.dispatchEvent(new CustomEvent(PARSE_JOB_SETTLED_EVENT, { detail }));
}

export function parseJobSettledDetail(
  event: Event,
): ParseJobSettledDetail | null {
  const detail = (event as CustomEvent<ParseJobSettledDetail | undefined>)
    .detail;
  if (typeof detail?.jobId !== "string") return null;
  return detail;
}
