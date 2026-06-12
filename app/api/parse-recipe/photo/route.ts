import { headers } from "next/headers";
import { callAiForRecipePhoto } from "@/lib/ai";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { buildPhotoPrompt } from "@/lib/parse-recipe/prompts";
import { enforceParseRateLimit } from "@/lib/rate-limit";
import { log } from "@/lib/telemetry";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = await enforceParseRateLimit(request, session?.user.id);
  if (limited) return limited;

  let body: { imageBase64?: string; mimeType?: string; userComment?: string };
  try {
    body = await request.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { imageBase64, mimeType, userComment } = body;
  if (!imageBase64 || !mimeType) {
    return ApiError.badRequest("imageBase64 and mimeType are required");
  }

  const startedAt = Date.now();
  try {
    const prompt = buildPhotoPrompt(userComment);
    const recipe = await callAiForRecipePhoto(imageBase64, mimeType, prompt);
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
    // The client (parseRecipeFromPhoto) maps the raw Gemini message to friendly
    // errors (503/429/quota), so surface it here while still reporting to Sentry.
    ApiError.capture(error, request);
    const message = error instanceof Error ? error.message : "Parse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
