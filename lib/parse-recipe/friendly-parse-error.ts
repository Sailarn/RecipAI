// User-facing copy for each recognized parse failure. Centralized so the
// retriable/permanent classification below can reference the exact strings.
const PARSE_ERROR_MESSAGES = {
  highDemand:
    "Gemini is experiencing high demand right now. Please try again in a moment.",
  quota: "API quota exceeded. Please try again later.",
  private:
    "This account is private or the content is restricted — only public posts can be parsed.",
  unsupportedPlatform:
    "Only Instagram Reels are supported. Try an Instagram link.",
  noContent:
    "No recipe found — the video has no speech or caption to extract from.",
  scrapeBlocked:
    "Couldn't read this page — the site may block scrapers. Try pasting the URL again or use a different source.",
} as const;

// Failures where re-running the same URL cannot succeed — the source itself is
// the blocker (private account, wrong platform, video with nothing to extract).
// Retry is hidden for these in the parse history.
const PERMANENT_MESSAGES = new Set<string>([
  PARSE_ERROR_MESSAGES.private,
  PARSE_ERROR_MESSAGES.unsupportedPlatform,
  PARSE_ERROR_MESSAGES.noContent,
]);

// Map a raw parse-job failure into a message the user can act on.
export function friendlyParseError(rawError: string): string {
  if (
    rawError.includes("503") ||
    rawError.includes("Service Unavailable") ||
    rawError.includes("high demand")
  ) {
    return PARSE_ERROR_MESSAGES.highDemand;
  }
  if (rawError.includes("429") || rawError.includes("quota")) {
    return PARSE_ERROR_MESSAGES.quota;
  }
  if (rawError.includes("restricted") || rawError.includes("private")) {
    return PARSE_ERROR_MESSAGES.private;
  }
  if (rawError.includes("Unsupported video platform")) {
    return PARSE_ERROR_MESSAGES.unsupportedPlatform;
  }
  if (
    rawError.includes("No speech detected") ||
    rawError.includes("no caption")
  ) {
    return PARSE_ERROR_MESSAGES.noContent;
  }
  if (
    rawError.includes("Could not extract") ||
    rawError.includes("too little HTML")
  ) {
    return PARSE_ERROR_MESSAGES.scrapeBlocked;
  }
  return rawError;
}

// Whether a failed parse is worth retrying. Takes the stored friendly `reason`.
// Permanent failures (private/restricted, unsupported platform, no extractable
// content) return false; transient and unknown failures return true.
export function isRetriableFailure(reason: string | undefined): boolean {
  if (!reason) return true;
  return !PERMANENT_MESSAGES.has(reason);
}
