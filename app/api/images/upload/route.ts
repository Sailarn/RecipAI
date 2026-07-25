import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { imagekit } from "@/lib/upload/imagekit";
import { requireUploadAuthOrRateLimit } from "@/lib/upload/upload-auth";
import { resolveImageSource } from "@/lib/upload/upload-image-source";

export async function POST(request: Request) {
  const authError = await requireUploadAuthOrRateLimit(request);
  if (authError) return authError;

  const resolved = await resolveImageSource(request);
  if (!resolved.ok) return resolved.response;

  try {
    const result = await imagekit.upload({
      file: resolved.source.fileData,
      fileName: resolved.source.fileName,
      folder: "/recipes",
    });
    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    return ApiError.internal(error, request);
  }
}
