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

interface DirectParseJob {
  request: Request;
  jobId: string;
  userId: string | null;
  source: "photo" | "text";
  extract: () => Promise<RecipeExtractionResult>;
}

// Photo and pasted-text parses run inline in the request rather than through
// the parse queue (there is no URL to cache or re-fetch), but still leave a
// parse_jobs row behind so the import shows up in history and anonymous jobs
// can be claimed after sign-in.
export async function runDirectParseJob({
  request,
  jobId,
  userId,
  source,
  extract,
}: DirectParseJob): Promise<Response> {
  try {
    await db.insert(parseJobs).values({
      id: jobId,
      userId,
      url: null,
      status: PARSE_JOB_STATUS.PROCESSING,
    });
  } catch (error) {
    return ApiError.internal(error, request, `Failed to start ${source} parse`);
  }

  const startedAt = Date.now();
  try {
    const recipe: ParsedRecipe = requireCompleteRecipe(
      await extract(),
      source,
      {
        jobId,
      },
    );
    await db
      .update(parseJobs)
      .set({
        status: PARSE_JOB_STATUS.DONE,
        result: recipe as unknown as Record<string, unknown>,
        parserVersion: PARSER_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId));
    log("info", "parse_pipeline", {
      source,
      path: "ai",
      total_ms: Date.now() - startedAt,
      ingredient_count: recipe.ingredients?.length ?? 0,
      step_count: recipe.instructions?.length ?? 0,
      success: true,
    });
    return Response.json(recipe);
  } catch (error) {
    await db
      .update(parseJobs)
      .set({
        status: PARSE_JOB_STATUS.FAILED,
        error: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(parseJobs.id, jobId))
      .catch((historyError) => ApiError.capture(historyError, request));
    // The client maps the raw Gemini message to friendly errors (503/429/
    // quota), so surface it here while still reporting to Sentry.
    ApiError.capture(error, request);
    const message = error instanceof Error ? error.message : "Parse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
