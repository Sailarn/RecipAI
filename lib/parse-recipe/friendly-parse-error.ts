// Centralized so isRetriableFailure can reference the exact strings.
const PARSE_ERROR_MESSAGES = {
  highDemand:
    "Gemini is experiencing high demand right now. Please try again in a moment.",
  quota: "API quota exceeded. Please try again later.",
  private:
    "This account is private or the content is restricted — only public posts can be parsed.",
  unsupportedPlatform:
    "This social platform is not supported. Try an Instagram, TikTok, YouTube, or X link.",
  tooLong:
    "This video is too long to parse. Social videos must be 30 minutes or shorter.",
  tooLarge: "This video file is too large to transcribe. Try a shorter clip.",
  notFound:
    "This social post could not be found. It may have been deleted or the link is invalid.",
  noContent:
    "No recipe found — the post has no caption, transcript, images, or video to extract from.",
  scrapeBlocked:
    "Couldn't read this page — the site may block scrapers. Try pasting the URL again or use a different source.",
  notRecipe:
    "No recipe found — the AI couldn't detect a recipe in this content. Try a link that goes directly to a recipe.",
} as const;

// Retry is hidden for these in the parse history — re-running the same URL cannot succeed.
const PERMANENT_MESSAGES = new Set<string>([
  PARSE_ERROR_MESSAGES.private,
  PARSE_ERROR_MESSAGES.unsupportedPlatform,
  PARSE_ERROR_MESSAGES.tooLong,
  PARSE_ERROR_MESSAGES.tooLarge,
  PARSE_ERROR_MESSAGES.notFound,
  PARSE_ERROR_MESSAGES.noContent,
  PARSE_ERROR_MESSAGES.notRecipe,
]);

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
  if (
    rawError.includes("restricted") ||
    rawError.includes("private") ||
    rawError.includes("login_required")
  ) {
    return PARSE_ERROR_MESSAGES.private;
  }
  if (
    rawError.includes("Unsupported video platform") ||
    rawError.includes("Unsupported social platform")
  ) {
    return PARSE_ERROR_MESSAGES.unsupportedPlatform;
  }
  if (rawError.includes("30 minutes or shorter")) {
    return PARSE_ERROR_MESSAGES.tooLong;
  }
  if (rawError.includes("too large")) {
    return PARSE_ERROR_MESSAGES.tooLarge;
  }
  if (
    rawError.includes("could not be found") ||
    rawError.includes("deleted") ||
    rawError.includes("invalid")
  ) {
    return PARSE_ERROR_MESSAGES.notFound;
  }
  if (
    rawError.includes("No speech detected") ||
    rawError.includes("no caption") ||
    rawError.includes("No caption, transcript, images, or video")
  ) {
    return PARSE_ERROR_MESSAGES.noContent;
  }
  if (
    rawError.includes("Could not extract") ||
    rawError.includes("too little HTML")
  ) {
    return PARSE_ERROR_MESSAGES.scrapeBlocked;
  }
  if (rawError.includes("Couldn't extract a recipe from this")) {
    return PARSE_ERROR_MESSAGES.notRecipe;
  }
  return rawError;
}

// Takes the stored friendly `reason` string (not the raw error).
export function isRetriableFailure(reason: string | undefined): boolean {
  if (!reason) return true;
  return !PERMANENT_MESSAGES.has(reason);
}
