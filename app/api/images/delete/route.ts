import { APIError } from "@imagekit/nodejs";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { ownershipFromTags } from "@/lib/upload/image-ownership";
import { isImageInUseByOthers } from "@/lib/upload/image-references";
import { deleteFromImageKit, getImageKitFileTags } from "@/lib/upload/imagekit";
import { requireUploadAuth, type UploadCaller } from "@/lib/upload/upload-auth";

// A connection failure carries no status; a 5xx is ImageKit's own trouble. The
// SDK has already retried both, and deletion is best-effort cleanup.
function isTransientImageKitError(error: APIError): boolean {
  return error.status === undefined || error.status >= 500;
}

async function mayDelete(
  fileId: string,
  caller: UploadCaller,
): Promise<boolean> {
  const tags = await getImageKitFileTags(fileId);
  const ownership = ownershipFromTags(tags, caller);
  if (ownership !== "untagged") return ownership === "owned";
  return !(await isImageInUseByOthers(fileId, caller));
}

export async function DELETE(request: Request) {
  const authed = await requireUploadAuth(request);
  if (authed.response) return authed.response;

  let body: { fileId?: string };
  try {
    body = await request.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { fileId } = body;
  if (!fileId) return ApiError.badRequest("fileId required");

  try {
    if (!(await mayDelete(fileId, authed.caller))) {
      return ApiError.forbidden();
    }
    await deleteFromImageKit(fileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof APIError) {
      // Already-deleted is a no-op success.
      if (error.status === 404) {
        return NextResponse.json({ success: true });
      }
      // Don't fail the request or spam Sentry; an orphaned file is harmless.
      if (isTransientImageKitError(error)) {
        logger.warn("[images/delete] ImageKit transient error", { fileId });
        return NextResponse.json({ success: false });
      }
    }
    return ApiError.internal(error, request);
  }
}
