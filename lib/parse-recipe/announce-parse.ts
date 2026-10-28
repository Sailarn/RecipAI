import { toast } from "sonner";
import { addParseNotification } from "@/lib/db/parse-notifications";
import { PARSE_HISTORY_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { dispatchParseJobSettled } from "@/lib/parse-job-events";
import { captureError } from "@/lib/telemetry";

/** A finished import shown on the parse page: the recipe is already saved. */
export interface SavedParse {
  recipeId: string;
  recipe: ParsedRecipe;
  alreadySaved: boolean;
}

/** Toast copy, passed in: these are plain functions with no next-intl hook. */
export interface SavedParseLabels {
  added: string;
  alreadySaved: string;
}

interface SavedParseAnnouncement {
  jobId: string;
  recipe: ParsedRecipe;
  recipeId: string;
  alreadySaved: boolean;
  labels: SavedParseLabels;
}

function reportNotificationFailure(error: unknown): void {
  captureError(error, { tags: { source: "parse-notification" } });
}

/**
 * A parse finished and its recipe is in the library: a bell entry, a plain
 * toast (no actions — the recipe is already saved), and the settled event for
 * the parse page.
 */
export function announceSavedParse({
  jobId,
  recipe,
  recipeId,
  alreadySaved,
  labels,
}: SavedParseAnnouncement): void {
  addParseNotification({
    id: jobId,
    status: PARSE_HISTORY_STATUS.DONE,
    title: recipe.title,
    recipeId,
    createdAt: new Date(),
  }).catch(reportNotificationFailure);
  dispatchParseJobSettled({
    jobId,
    status: "done",
    recipeId,
    recipe,
    alreadySaved,
  });
  toast.success(recipe.title, {
    description: alreadySaved ? labels.alreadySaved : labels.added,
  });
}

interface FailedParse {
  jobId: string;
  /** What failed to parse — the link, or the import kind for photo/text. */
  title: string;
  reason: string;
}

/** A parse failed: a bell entry and the settled event. The caller toasts. */
export function announceFailedParse({
  jobId,
  title,
  reason,
}: FailedParse): void {
  addParseNotification({
    id: jobId,
    status: PARSE_HISTORY_STATUS.FAILED,
    title,
    reason,
    createdAt: new Date(),
  }).catch(reportNotificationFailure);
  dispatchParseJobSettled({ jobId, status: "failed", reason });
}
