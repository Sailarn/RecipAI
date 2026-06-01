import { type NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";
import { mintUploadToken } from "@/lib/upload-token";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { url?: string; userComment?: string };
  try {
    body = await request.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { url, userComment } = body;
  if (!url) return ApiError.badRequest("URL is required");

  try {
    const [recipe, uploadToken] = await Promise.all([
      parseRecipeFromUrl(url, userComment),
      mintUploadToken(),
    ]);
    return NextResponse.json({ success: true, recipe, uploadToken });
  } catch (error) {
    return ApiError.internal(error, request, "Failed to parse recipe");
  }
}
