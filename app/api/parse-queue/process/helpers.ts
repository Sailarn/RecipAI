import type { ParsedRecipe } from "@/lib/db/schema";
import { SocialParseError } from "@/lib/parse-recipe/social-parse-error";
import { captureError } from "@/lib/telemetry";

const PARSE_RETRY_ATTEMPTS = 2;
const PARSE_RETRY_DELAY_MS = 4000;
const GENERIC_PARSE_ERROR_MESSAGE =
  "❌ Failed to parse recipe from that link.\n\nTry again or open RecipAI to parse manually.";

interface ParseFailureJob {
  id: string;
  url: string | null;
  userId: string | null;
  telegramChatId: string | null;
}

export function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("restricted") || msg.includes("private")) return false;
  if (msg.includes("could not be found") || msg.includes("deleted"))
    return false;
  if (
    msg.includes("Unsupported video platform") ||
    msg.includes("Unsupported social platform")
  ) {
    return false;
  }
  if (msg.includes("No speech detected") && msg.includes("no caption"))
    return false;
  if (msg.includes("No caption, transcript, images, or video")) return false;
  if (msg.includes("Couldn't extract a recipe from this")) return false;
  if (msg.includes("30 minutes or shorter")) return false;
  if (msg.includes("too large")) return false;
  if (msg.includes("not configured")) return false;
  return true;
}

export function classifyParseError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("restricted") || msg.includes("private")) {
    return "🔒 This account is private or the content is restricted. Only public posts can be parsed.";
  }
  if (
    msg.includes("Unsupported video platform") ||
    msg.includes("Unsupported social platform")
  ) {
    return "📹 This social platform is not supported. Try an Instagram, TikTok, YouTube, or X link.";
  }
  if (msg.includes("30 minutes or shorter")) {
    return "⏱️ This video is too long to parse. Social videos must be 30 minutes or shorter.";
  }
  if (msg.includes("too large")) {
    return "⏱️ This video file is too large to transcribe. Try a shorter clip.";
  }
  if (msg.includes("could not be found") || msg.includes("deleted")) {
    return "🔎 This social post could not be found. It may have been deleted or the link is invalid.";
  }
  if (
    msg.includes("No speech detected") ||
    msg.includes("no caption") ||
    msg.includes("No caption, transcript, images, or video")
  ) {
    return "🎙️ No recipe found — the post has no caption, transcript, images, or video to extract from.";
  }
  if (msg.includes("Could not extract enough text")) {
    return "📄 Couldn't read the page. The website may be blocking scrapers.";
  }
  if (msg.includes("Couldn't extract a recipe from this")) {
    return "🔍 No recipe found — the AI couldn't detect a recipe in this content. Try a link that goes directly to a recipe.";
  }
  return GENERIC_PARSE_ERROR_MESSAGE;
}

// Known outcomes (private post, no recipe, too long, …) are told to the user and
// logged, not reported; only a failure nothing explains is a Sentry error.
function isUnexplainedParseFailure(error: unknown): boolean {
  if (error instanceof SocialParseError) {
    return error.details.reason === "unexpected";
  }
  return classifyParseError(error) === GENERIC_PARSE_ERROR_MESSAGE;
}

// Called once retries are exhausted, so a failure a retry recovered from never
// reaches Sentry. Runs here rather than inside the parsers because only the job
// knows who asked and from where.
export function reportParseFailure(error: unknown, job: ParseFailureJob): void {
  if (!isUnexplainedParseFailure(error)) return;

  const social = error instanceof SocialParseError ? error.details : undefined;
  captureError(error, {
    tags: {
      source: job.telegramChatId ? "telegram" : "app",
      ...(social && {
        parser: "social",
        platform: social.platform ?? "unknown",
      }),
    },
    user: job.userId ? { id: job.userId } : undefined,
    extra: {
      jobId: job.id,
      url: job.url,
      retried: isRetryable(error),
      reason: social?.reason,
      duration_seconds: social?.durationSeconds,
    },
  });
}

export async function parseWithRetry(
  parseFn: (url: string) => Promise<ParsedRecipe>,
  url: string,
  attempts = PARSE_RETRY_ATTEMPTS,
  delayMs = PARSE_RETRY_DELAY_MS,
): Promise<ParsedRecipe> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await parseFn(url);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
