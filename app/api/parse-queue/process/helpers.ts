import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";

export const PARSE_RETRY_ATTEMPTS = 2;
export const PARSE_RETRY_DELAY_MS = 4000;

/**
 * Returns false for errors that will always fail regardless of retrying —
 * private accounts, unsupported platforms, missing API tokens, etc.
 */
export function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("restricted") || msg.includes("private")) return false;
  if (msg.includes("Unsupported video platform")) return false;
  if (msg.includes("No speech detected") && msg.includes("no caption"))
    return false;
  if (msg.includes("not configured")) return false;
  return true;
}

/**
 * Maps a parse error to a user-facing Telegram message.
 * Returns a specific message for known failure modes, generic otherwise.
 */
export function classifyParseError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("restricted") || msg.includes("private")) {
    return "🔒 This account is private or the content is restricted. Only public posts can be parsed.";
  }
  if (msg.includes("Unsupported video platform")) {
    return "📹 Only Instagram Reels are supported. Try an Instagram link.";
  }
  if (msg.includes("No speech detected") || msg.includes("no caption")) {
    return "🎙️ No recipe found — the video has no speech or caption to extract from.";
  }
  if (msg.includes("Could not extract enough text")) {
    return "📄 Couldn't read the page. The website may be blocking scrapers.";
  }
  return "❌ Failed to parse recipe from that link.\n\nTry again or open RecipAI to parse manually.";
}

/**
 * Runs parseFn with retry. Immediately re-throws non-retryable errors.
 * Retryable errors are retried up to `attempts` total with `delayMs` between.
 */
export async function parseWithRetry(
  parseFn: (url: string, userComment?: string) => Promise<ParsedRecipe>,
  url: string,
  userComment?: string,
  attempts = PARSE_RETRY_ATTEMPTS,
  delayMs = PARSE_RETRY_DELAY_MS,
): Promise<ParsedRecipe> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await parseFn(url, userComment);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) break;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}
