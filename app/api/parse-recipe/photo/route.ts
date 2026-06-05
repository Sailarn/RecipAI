import { headers } from "next/headers";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { callGeminiForRecipePhoto } from "@/lib/gemini";
import { buildPhotoPrompt } from "@/lib/parse-recipe/prompts";
import { enforceParseRateLimit } from "@/lib/rate-limit";

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

  try {
    const prompt = buildPhotoPrompt(userComment);
    const recipe = await callGeminiForRecipePhoto(
      imageBase64,
      mimeType,
      prompt,
    );
    return Response.json(recipe);
  } catch (error) {
    // The client (parseRecipeFromPhoto) maps the raw Gemini message to friendly
    // errors (503/429/quota), so surface it here while still reporting to Sentry.
    ApiError.capture(error, request);
    const message = error instanceof Error ? error.message : "Parse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
