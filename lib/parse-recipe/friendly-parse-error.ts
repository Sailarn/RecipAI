// Map a raw parse-job failure into a message the user can act on.
export function friendlyParseError(rawError: string): string {
  if (
    rawError.includes("503") ||
    rawError.includes("Service Unavailable") ||
    rawError.includes("high demand")
  ) {
    return "Gemini is experiencing high demand right now. Please try again in a moment.";
  }
  if (rawError.includes("429") || rawError.includes("quota")) {
    return "API quota exceeded. Please try again later.";
  }
  if (rawError.includes("restricted") || rawError.includes("private")) {
    return "This account is private or the content is restricted — only public posts can be parsed.";
  }
  if (rawError.includes("Unsupported video platform")) {
    return "Only Instagram Reels are supported. Try an Instagram link.";
  }
  if (
    rawError.includes("No speech detected") ||
    rawError.includes("no caption")
  ) {
    return "No recipe found — the video has no speech or caption to extract from.";
  }
  if (
    rawError.includes("Could not extract") ||
    rawError.includes("too little HTML")
  ) {
    return "Couldn't read this page — the site may block scrapers. Try pasting the URL again or use a different source.";
  }
  return rawError;
}
