import { recordParseHistory } from "@/lib/db/parse-history";
import { saveParsedResult } from "@/lib/db/save-parsed-recipe";
import type { ParsedRecipe } from "@/lib/db/schema";
import {
  announceSavedParse,
  type SavedParseLabels,
} from "@/lib/parse-recipe/announce-parse";
import { doneParseHistoryEntry } from "@/lib/parse-recipe/parse-history-entry";
import { captureError, trackEvent } from "@/lib/telemetry";

interface FinishedLinkParse {
  jobId: string;
  recipe: ParsedRecipe;
  /** The link the job was started with — the history fallback. */
  jobUrl: string;
  /** Set when the server already saved the recipe (signed-in imports). */
  savedRecipeId?: string;
  /** The server found the link already in the library (cache hits only). */
  alreadySaved?: boolean;
  uploadToken?: string;
  triggerSync: () => Promise<void>;
  labels: SavedParseLabels;
}

export interface CompletedLinkParse {
  recipeId: string;
  alreadySaved: boolean;
}

/**
 * Everything that follows a finished link import, wherever it was noticed —
 * the background watcher or the parse page's instant cache hit. A signed-in
 * import was saved server-side, so it is pulled into the local library; an
 * anonymous one is saved on the device. Either way it is recorded, announced
 * in the bell, and toasted.
 */
export async function completeLinkParse({
  jobId,
  recipe,
  jobUrl,
  savedRecipeId,
  alreadySaved = false,
  uploadToken,
  triggerSync,
  labels,
}: FinishedLinkParse): Promise<CompletedLinkParse> {
  let completed: CompletedLinkParse;
  if (savedRecipeId) {
    completed = { recipeId: savedRecipeId, alreadySaved };
    trackEvent("recipe_saved", { source: "auto" });
    triggerSync().catch((syncError) => {
      captureError(syncError, { tags: { source: "complete-link-parse" } });
    });
  } else {
    completed = await saveParsedResult(recipe, uploadToken);
  }

  trackEvent("parse_succeeded", { source: "url" });
  recordParseHistory(
    doneParseHistoryEntry(jobId, recipe.title, recipe.sourceUrl ?? jobUrl),
  ).catch(() => {});
  announceSavedParse({ jobId, recipe, ...completed, labels });
  return completed;
}
