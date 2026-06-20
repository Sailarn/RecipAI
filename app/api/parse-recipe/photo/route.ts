import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { callAiForRecipePhoto } from "@/lib/ai";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { PARSER_VERSION } from "@/lib/parse-recipe/parser-version";
import { buildPhotoPrompt } from "@/lib/parse-recipe/prompts";
import { requireCompleteRecipe } from "@/lib/parse-recipe/recipe-result";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/telemetry";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = await enforceParseRateLimit(request, session?.user.id);
  if (limited) return limited;

  let body: { imageBase64?: string; mimeType?: string; jobId?: string };
  try {
    body = await request.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType) {
    return ApiError.badRequest("imageBase64 and mimeType are required");
  }

  const jobId = body.jobId ?? crypto.randomUUID();
  try {
    await db.insert(parseJobs).values({
      id: jobId,
      userId: session?.user.id ?? null,
      url: null,
      status: PARSE_JOB_STATUS.PROCESSING,
    });
  } catch (error) {
    return ApiError.internal(error, request, "Failed to start photo parse");
  }

  const startedAt = Date.now();
  try {
    const prompt = buildPhotoPrompt();
    const recipe = requireCompleteRecipe(
      await callAiForRecipePhoto(imageBase64, mimeType, prompt),
      "photo",
      { jobId },
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
      source: "photo",
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
    // The client (parseRecipeFromPhoto) maps the raw Gemini message to friendly
    // errors (503/429/quota), so surface it here while still reporting to Sentry.
    ApiError.capture(error, request);
    const message = error instanceof Error ? error.message : "Parse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
