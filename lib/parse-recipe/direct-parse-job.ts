import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { ApiError } from "@/lib/api-errors";
import { PARSE_JOB_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { PARSER_VERSION } from "@/lib/parse-recipe/parser-version";
import {
  type RecipeExtractionResult,
  requireCompleteRecipe,
} from "@/lib/parse-recipe/recipe-result";
import { log } from "@/lib/telemetry";

export interface DirectParseJob {
  jobId: string;
  userId: string | null;
  source: "photo" | "text";
  extract: () => Promise<RecipeExtractionResult>;
  /** Set for bot-originated parses, mirroring queued Telegram jobs. */
  telegramChatId?: string;
}

/** The parse_jobs row couldn't be created — nothing was parsed. */
class ParseJobStartError extends Error {}

// Photo and pasted-text parses run inline rather than through the parse queue
// (there is no URL to cache or re-fetch), but still leave a parse_jobs row
// behind so the import shows up in history and anonymous jobs can be claimed
// after sign-in. Throws ParseJobStartError when the row can't be created, and
// the parse error itself (after marking the row failed) when parsing fails.
// A failure to record a successful parse is reported but never thrown.
export async function executeDirectParseJob({
  jobId,
  userId,
  source,
  extract,
  telegramChatId,
}: DirectParseJob): Promise<ParsedRecipe> {
  try {
    await db.insert(parseJobs).values({
      id: jobId,
      userId,
      url: null,
      telegramChatId: telegramChatId ?? null,
      status: PARSE_JOB_STATUS.PROCESSING,
    });
  } catch (error) {
    throw new ParseJobStartError(`Failed to start ${source} parse`, {
      cause: error,
    });
  }

  const startedAt = Date.now();
  let recipe: ParsedRecipe;
  try {
    recipe = requireCompleteRecipe(await extract(), source, { jobId });
  } catch (error) {
    await db
      .update(parseJobs)
      .set({
        status: PARSE_JOB_STATUS.FAILED,
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId))
      .catch((historyError) => ApiError.capture(historyError));
    throw error;
  }

  // The recipe is already paid for: a failed history write is reported, not
  // turned into a parse failure the user would have to retry.
  await db
    .update(parseJobs)
    .set({
      status: PARSE_JOB_STATUS.DONE,
      result: recipe,
      parserVersion: PARSER_VERSION,
      updatedAt: new Date(),
    })
    .where(eq(parseJobs.id, jobId))
    .catch((historyError) => ApiError.capture(historyError));
  log("info", "parse_pipeline", {
    source,
    path: "ai",
    total_ms: Date.now() - startedAt,
    ingredient_count: recipe.ingredients?.length ?? 0,
    step_count: recipe.instructions?.length ?? 0,
    success: true,
  });
  return recipe;
}

/** executeDirectParseJob for an API route: the recipe as JSON, or an error. */
export async function runDirectParseJob(
  request: Request,
  job: DirectParseJob,
): Promise<Response> {
  try {
    return Response.json(await executeDirectParseJob(job));
  } catch (error) {
    if (error instanceof ParseJobStartError) {
      return ApiError.internal(error.cause, request, error.message);
    }
    // The client maps the raw Gemini message to friendly errors (503/429/
    // quota), so surface it here while still reporting to Sentry.
    ApiError.capture(error, request);
    const message = error instanceof Error ? error.message : "Parse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
