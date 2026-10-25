import { headers } from "next/headers";
import { callAiForRecipePhoto } from "@/lib/ai";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { runDirectParseJob } from "@/lib/parse-recipe/direct-parse-job";
import { buildPhotoPrompt } from "@/lib/parse-recipe/prompts";
import { enforceParseRateLimit } from "@/lib/rate-limit";

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

  return runDirectParseJob({
    request,
    jobId: body.jobId ?? crypto.randomUUID(),
    userId: session?.user.id ?? null,
    source: "photo",
    extract: () =>
      callAiForRecipePhoto(imageBase64, mimeType, buildPhotoPrompt()),
  });
}
