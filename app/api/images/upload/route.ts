import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { uploadToImageKit } from "@/lib/upload/imagekit";
import { requireUploadAuthOrRateLimit } from "@/lib/upload/upload-auth";
import { resolveImageSource } from "@/lib/upload/upload-image-source";

export async function POST(request: Request) {
  const authError = await requireUploadAuthOrRateLimit(request);
  if (authError) return authError;

  const resolved = await resolveImageSource(request);
  if (!resolved.ok) return resolved.response;

  try {
    const uploaded = await uploadToImageKit(
      resolved.source.fileData,
      resolved.source.fileName,
    );
    return NextResponse.json(uploaded);
  } catch (error) {
    return ApiError.internal(error, request);
  }
}
