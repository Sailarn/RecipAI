import { headers } from "next/headers";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { runDirectParseJob } from "@/lib/parse-recipe/direct-parse-job";
import { MIN_RECIPE_TEXT_CHARS } from "@/lib/parse-recipe/text";
import { extractRecipeFromText } from "@/lib/parse-recipe/text-extract";
import {
  enforceAnonTextParseRateLimit,
  enforceParseRateLimit,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited =
    (await enforceParseRateLimit(request, session?.user.id)) ??
    (session ? null : await enforceAnonTextParseRateLimit(request));
  if (limited) return limited;

  let body: { text?: unknown; jobId?: string };
  try {
    body = await request.json();
  } catch {
    return ApiError.invalidBody();
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < MIN_RECIPE_TEXT_CHARS) {
    return ApiError.badRequest("text is required");
  }

  return runDirectParseJob(request, {
    jobId: body.jobId ?? crypto.randomUUID(),
    userId: session?.user.id ?? null,
    source: "text",
    extract: () => extractRecipeFromText(text),
  });
}
