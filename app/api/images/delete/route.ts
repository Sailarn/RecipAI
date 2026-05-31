import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { imagekit } from "@/lib/imagekit";
import { requireUploadAuth } from "@/lib/upload-auth";

export async function DELETE(request: Request) {
  const authError = await requireUploadAuth(request);
  if (authError) return authError;

  let body: { fileId?: string };
  try {
    body = await request.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { fileId } = body;
  if (!fileId) return ApiError.badRequest("fileId required");

  try {
    await imagekit.deleteFile(fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not exist")) {
      return NextResponse.json({ success: true });
    }
    return ApiError.internal(error, request);
  }
}
