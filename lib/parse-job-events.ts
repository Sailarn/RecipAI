export const PARSED_RECIPE_CREATED_EVENT = "parsed-recipe-created";

interface ParsedRecipeCreatedEventDetail {
  jobId: string;
  entryId: string;
}

export function dispatchParsedRecipeCreated(
  detail: ParsedRecipeCreatedEventDetail,
): void {
  window.dispatchEvent(
    new CustomEvent(PARSED_RECIPE_CREATED_EVENT, { detail }),
  );
}

export function parseParsedRecipeCreatedEvent(
  event: Event,
): ParsedRecipeCreatedEventDetail | null {
  const detail = (event as CustomEvent<Partial<ParsedRecipeCreatedEventDetail>>)
    .detail;
  if (typeof detail?.jobId !== "string") return null;
  if (typeof detail.entryId !== "string") return null;
  return { jobId: detail.jobId, entryId: detail.entryId };
}
