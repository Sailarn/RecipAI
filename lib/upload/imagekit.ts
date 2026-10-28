import ImageKit from "@imagekit/nodejs";
import { imageFetchHeaders } from "@/lib/upload/image-fetch-headers";
import { PARSE_CACHE_OWNER_TAG } from "@/lib/upload/image-ownership";
import { sourceFetchFailedMessage } from "@/lib/upload/source-image-failure";
import {
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  UPLOAD_ERRORS,
} from "@/lib/upload/upload-limits";

// The SDK reads IMAGEKIT_PRIVATE_KEY itself, but throws at construction when it
// is unset — and this module is imported while `next build` collects routes,
// where the key may be absent. An empty key defers the failure to the request.
const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
});

const RECIPE_IMAGE_FOLDER = "/recipes";

export interface UploadedImage {
  url: string;
  fileId: string;
}

/**
 * Uploads base64 image data into the recipe image folder, tagged with its
 * owner (see `lib/upload/image-ownership.ts`).
 */
export async function uploadToImageKit(
  base64File: string,
  fileName: string,
  ownerTag: string,
): Promise<UploadedImage> {
  const result = await imagekit.files.upload({
    file: base64File,
    fileName,
    folder: RECIPE_IMAGE_FOLDER,
    tags: [ownerTag],
  });
  // Both are typed optional, but a successful upload always returns them —
  // without either the image could never be shown or cleaned up.
  if (!result.url || !result.fileId) {
    throw new Error("ImageKit upload returned no url or fileId");
  }
  return { url: result.url, fileId: result.fileId };
}

export async function getImageKitFileTags(fileId: string): Promise<string[]> {
  const file = await imagekit.files.get(fileId);
  return file.tags ?? [];
}

export async function deleteFromImageKit(fileId: string): Promise<void> {
  await imagekit.files.delete(fileId);
}

/** Mirrors a parse's source image; the file belongs to the parse cache. */
export async function uploadImageServer(url: string): Promise<UploadedImage> {
  const response = await fetch(url, { headers: imageFetchHeaders(url) });
  if (!response.ok) {
    const host = URL.canParse(url) ? new URL(url).host : url;
    throw new Error(sourceFetchFailedMessage(response.status, host));
  }

  const fetchedContentType = response.headers.get("content-type") ?? "";
  if (!isAllowedImageType(fetchedContentType))
    throw new Error(
      `${UPLOAD_ERRORS.UNSUPPORTED_TYPE} (got "${fetchedContentType}")`,
    );

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES)
    throw new Error(UPLOAD_ERRORS.FILE_TOO_LARGE);

  const base64 = Buffer.from(buffer).toString("base64");
  return uploadToImageKit(
    base64,
    `recipe-${Date.now()}`,
    PARSE_CACHE_OWNER_TAG,
  );
}
