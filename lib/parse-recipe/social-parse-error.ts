import type { SocialPlatform } from "@/lib/video-url";

export type SocialParseFailureReason =
  | "duration_limit"
  | "media_too_large"
  | "unsupported_platform"
  | "restricted"
  | "not_found"
  | "no_content"
  | "unexpected";

export interface SocialParseFailureDetails {
  platform: SocialPlatform | null;
  reason: SocialParseFailureReason;
  durationSeconds?: number;
}

// Carries what the social pipeline knew about a failed attempt up to the caller,
// which decides whether to report it — a parse queue retry can still recover, so
// a single failed attempt is not an error yet. Keeps the original message so
// retry and user-facing classification still match on it; the original error is
// the `cause`.
export class SocialParseError extends Error {
  readonly details: SocialParseFailureDetails;

  constructor(cause: unknown, details: SocialParseFailureDetails) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = "SocialParseError";
    this.details = details;
  }
}
