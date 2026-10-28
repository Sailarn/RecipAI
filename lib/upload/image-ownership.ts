import { createHash } from "node:crypto";
import type { UploadCaller } from "@/lib/upload/upload-auth";

// Every ImageKit upload is tagged with exactly one owner tag, read back before
// a delete. Tags are free-form strings in ImageKit; the prefix marks ours.
const OWNER_TAG_PREFIX = "owner-";

// Parse-time images belong to the parse result cache: a cached parse hands the
// same file to every user who imports that link, so no single user may delete
// it — doing so would break the image in everyone else's copy.
export const PARSE_CACHE_OWNER_TAG = `${OWNER_TAG_PREFIX}parse-cache`;
// Uploaded without a session or token (rate-limited anonymous edits). Nobody
// can prove they own it, so it is never deleted on request.
const ANONYMOUS_OWNER_TAG = `${OWNER_TAG_PREFIX}anonymous`;

// Upload tokens are bearer credentials; only a hash goes into the tag, which is
// visible to anyone with ImageKit dashboard access.
function uploadTokenTag(uploadToken: string): string {
  const digest = createHash("sha256").update(uploadToken).digest("hex");
  return `${OWNER_TAG_PREFIX}token-${digest.slice(0, 32)}`;
}

export function ownerTagFor(caller: UploadCaller | null): string {
  if (!caller) return ANONYMOUS_OWNER_TAG;
  if ("userId" in caller) return `${OWNER_TAG_PREFIX}user-${caller.userId}`;
  return uploadTokenTag(caller.uploadToken);
}

export type TagOwnership = "owned" | "not-owned" | "untagged";

/** Whether the caller owns a file, judged by its owner tag alone. */
export function ownershipFromTags(
  tags: readonly string[],
  caller: UploadCaller,
): TagOwnership {
  const ownerTag = tags.find((tag) => tag.startsWith(OWNER_TAG_PREFIX));
  if (!ownerTag) return "untagged";
  return ownerTag === ownerTagFor(caller) ? "owned" : "not-owned";
}
