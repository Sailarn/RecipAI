export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

export const UPLOAD_ERRORS = {
  UNSUPPORTED_TYPE: "unsupported file type — allowed: jpeg, png, webp, gif",
  FILE_TOO_LARGE: "file exceeds 10 MB limit",
} as const;

/** Strips charset/boundary suffixes before comparing, e.g. "image/jpeg; charset=..." */
export function isAllowedImageType(mimeType: string): boolean {
  const baseType = mimeType.split(";")[0].trim().toLowerCase();
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(baseType);
}
