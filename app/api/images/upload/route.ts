import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { ownerTagFor } from "@/lib/upload/image-ownership";
import { uploadToImageKit } from "@/lib/upload/imagekit";
import { requireUploadAuthOrRateLimit } from "@/lib/upload/upload-auth";
import { resolveImageSource } from "@/lib/upload/upload-image-source";

export async function POST(request: Request) {
  const authed = await requireUploadAuthOrRateLimit(request);
  if (authed.response) return authed.response;

  const resolved = await resolveImageSource(request);
  if (!resolved.ok) return resolved.response;

  try {
    const uploaded = await uploadToImageKit(
      resolved.source.fileData,
      resolved.source.fileName,
      ownerTagFor(authed.caller),
    );
    return NextResponse.json(uploaded);
  } catch (error) {
    return ApiError.internal(error, request);
  }
}
