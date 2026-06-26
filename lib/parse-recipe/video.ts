import { callAiForRecipe } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { fetchSocialContent, type SocialContent } from "@/lib/scrapers/apify";
import { captureError, log, trackEvent } from "@/lib/telemetry";
import { GROQ_MAX_BYTES, transcribeWithGroq } from "@/lib/transcribe/groq";
import { getSocialPlatform, type SocialPlatform } from "@/lib/video-url";
import { buildSocialPrompt } from "./prompts";
import { requireCompleteRecipe } from "./recipe-result";

const MIN_TRANSCRIPT_LENGTH = 30;
const MAX_SOCIAL_VIDEO_SECONDS = 30 * 60;

type SocialParsePath =
  | "actor_transcript"
  | "media_transcription"
  | "caption_image";

type SocialParseFailureReason =
  | "duration_limit"
  | "media_too_large"
  | "unsupported_platform"
  | "restricted"
  | "not_found"
  | "no_content"
  | "unexpected";

interface SocialParseFailureContext {
  platform: SocialPlatform | null;
  url: string;
  startedAt: number;
  error: unknown;
  content?: SocialContent;
}

interface SocialParseSuccessContext {
  content: SocialContent;
  path: SocialParsePath;
  startedAt: number;
  recipe: ParsedRecipe;
}

async function transcribeMedia(
  videoUrl: string,
  isAudio: boolean | undefined,
): Promise<string> {
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Video fetch failed: ${videoRes.status}`);
  const contentLength = Number(videoRes.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > GROQ_MAX_BYTES) {
    throw new Error(
      "Video file too large for transcription (>24MB). Video may be too long.",
    );
  }

  const videoBuffer = await videoRes.arrayBuffer();
  return transcribeWithGroq(videoBuffer, isAudio);
}

function hasPromptContent(content: SocialContent, transcript: string): boolean {
  return !!(
    transcript ||
    content.caption ||
    content.imageUrls.length ||
    content.videoUrl
  );
}

async function getTranscript(content: SocialContent): Promise<string> {
  if (content.transcript) return content.transcript;
  if (!content.videoUrl) return "";

  return transcribeMedia(content.videoUrl, content.isAudio ?? false);
}

function enforceDurationLimit(content: SocialContent): void {
  if (
    content.durationSeconds !== undefined &&
    content.durationSeconds > MAX_SOCIAL_VIDEO_SECONDS
  ) {
    throw new Error(
      "This video is too long to parse. Social videos must be 30 minutes or shorter.",
    );
  }
}

function socialParsePath(
  content: SocialContent,
  transcript: string,
): SocialParsePath {
  if (!transcript) return "caption_image";
  return content.transcript ? "actor_transcript" : "media_transcription";
}

function failureReason(error: unknown): SocialParseFailureReason {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("30 minutes or shorter")) return "duration_limit";
  if (message.includes("too large")) return "media_too_large";
  if (message.includes("Unsupported social platform")) {
    return "unsupported_platform";
  }
  if (message.includes("restricted") || message.includes("private")) {
    return "restricted";
  }
  if (
    message.includes("could not be found") ||
    message.includes("deleted") ||
    message.includes("invalid")
  ) {
    return "not_found";
  }
  if (
    message.includes("No caption, transcript, images, or video") ||
    message.includes("No speech detected") ||
    message.includes("Couldn't extract a recipe from this")
  ) {
    return "no_content";
  }
  return "unexpected";
}

function shouldCaptureFailure(reason: SocialParseFailureReason): boolean {
  return reason === "unexpected";
}

function logFailure({
  platform,
  url,
  startedAt,
  error,
  content,
}: SocialParseFailureContext): void {
  const reason = failureReason(error);
  const message = error instanceof Error ? error.message : String(error);
  trackEvent("social_parse_failed", {
    platform: platform ?? "unknown",
    reason,
  });
  log("warn", "social_parse_failed", {
    platform,
    url,
    reason,
    duration_seconds: content?.durationSeconds,
    has_caption: content ? !!content.caption : undefined,
    has_transcript: content ? !!content.transcript : undefined,
    has_video: content ? !!content.videoUrl : undefined,
    image_count: content?.imageUrls.length,
    total_ms: Date.now() - startedAt,
    error_message: message,
  });
  if (shouldCaptureFailure(reason)) {
    captureError(error, {
      tags: {
        parser: "social",
        platform: platform ?? "unknown",
      },
      extra: {
        url,
        reason,
        duration_seconds: content?.durationSeconds,
      },
    });
  }
}

function logSuccess({
  content,
  path,
  startedAt,
  recipe,
}: SocialParseSuccessContext): void {
  const eventProperties = {
    platform: content.platform,
    path,
    duration_seconds: content.durationSeconds,
  };
  trackEvent("social_parse_succeeded", eventProperties);
  log("info", "social_parse_pipeline", {
    ...eventProperties,
    source: "social",
    url: content.url,
    has_caption: !!content.caption,
    has_transcript: !!content.transcript,
    has_video: !!content.videoUrl,
    image_count: content.imageUrls.length,
    ingredient_count: recipe.ingredients?.length ?? 0,
    step_count: recipe.instructions?.length ?? 0,
    total_ms: Date.now() - startedAt,
    success: true,
  });
}

async function parseSocialContent(
  url: string,
  content: SocialContent,
  startedAt: number,
): Promise<ParsedRecipe> {
  enforceDurationLimit(content);
  let transcript = await getTranscript(content);
  if (transcript.length < MIN_TRANSCRIPT_LENGTH) {
    if (!content.caption && content.imageUrls.length === 0) {
      throw new Error(
        "No caption, transcript, images, or video available. Cannot extract recipe.",
      );
    }
    transcript = "";
  }

  if (!hasPromptContent(content, transcript)) {
    throw new Error(
      "No caption, transcript, images, or video available. Cannot extract recipe.",
    );
  }

  const prompt = buildSocialPrompt(content, transcript);
  const recipe = requireCompleteRecipe(
    await callAiForRecipe(prompt),
    "social",
    { url },
  );

  if (!recipe.imageUrl) {
    recipe.imageUrl = content.thumbnailUrl ?? content.imageUrls[0];
  }

  const parsedRecipe = { ...recipe, sourceUrl: url };
  logSuccess({
    content,
    path: socialParsePath(content, transcript),
    startedAt,
    recipe: parsedRecipe,
  });
  return parsedRecipe;
}

export async function parseVideoRecipe(url: string): Promise<ParsedRecipe> {
  const startedAt = Date.now();
  const platform = getSocialPlatform(url);
  if (!platform) {
    const error = new Error(
      "Unsupported social platform. Use an Instagram, TikTok, YouTube, or X link.",
    );
    logFailure({ platform, url, startedAt, error });
    throw error;
  }

  trackEvent("social_parse_started", { platform });

  let content: SocialContent | undefined;
  try {
    content = await fetchSocialContent(url);
    return await parseSocialContent(url, content, startedAt);
  } catch (error) {
    logFailure({
      platform: content?.platform ?? platform,
      url,
      startedAt,
      error,
      content,
    });
    throw error;
  }
}
