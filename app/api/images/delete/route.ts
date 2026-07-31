import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { imagekit } from "@/lib/upload/imagekit";
import { requireUploadAuth } from "@/lib/upload/upload-auth";

// ImageKit's SDK rejects with a plain `{ message, help }` object, not an Error,
// so an `instanceof Error` check reads an empty message and every expected
// outcome below falls through to a Sentry-reported 500.
function imagekitErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string") return message;
  }
  return "";
}

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
    const message = imagekitErrorMessage(error);
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
