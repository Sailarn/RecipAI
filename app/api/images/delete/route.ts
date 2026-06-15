import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { imagekit } from "@/lib/upload/imagekit";
import { requireUploadAuth } from "@/lib/upload/upload-auth";

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
    const message = error instanceof Error ? error.message : "";
    // Already-deleted is a no-op success.
    if (message.includes("does not exist")) {
      return NextResponse.json({ success: true });
    }
    // ImageKit's own transient 5xx — deletion is best-effort cleanup, so don't
    // fail the request or spam Sentry; an orphaned file is harmless.
    if (message.includes("internal error")) {
      logger.warn("[images/delete] ImageKit transient error", { fileId });
      return NextResponse.json({ success: false });
    }
    return ApiError.internal(error, request);
  }
}
