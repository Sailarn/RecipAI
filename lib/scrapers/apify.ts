import { getSocialPlatform, type SocialPlatform } from "@/lib/video-url";
import {
  collectMediaImages,
  extractActorTranscript,
  getCaption,
  getDurationSeconds,
  getVideoUrl,
  tryFetchSubtitles,
} from "./apify-item-content";
import { type ApifyItem, getString, isRecord } from "./apify-item-fields";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

class FatalApifyError extends Error {}

type ActorInput = Record<string, unknown>;

export interface SocialContent {
  platform: SocialPlatform;
  url: string;
  caption?: string;
  transcript?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  imageUrls: string[];
  durationSeconds?: number;
  isAudio?: boolean;
}

const ACTOR_BY_PLATFORM = {
  instagram: {
    id: "apify~instagram-reel-scraper",
    input: (url: string) => ({ username: [url], resultsLimit: 1 }),
  },
  tiktok: {
    id: "clockworks~tiktok-scraper",
    input: (url: string) => ({
      postURLs: [url],
      resultsPerPage: 1,
      shouldDownloadVideos: true,
    }),
  },
  youtube: {
    id: "streamers~youtube-scraper",
    input: (url: string) => ({
      startUrls: [{ url }],
      maxResults: 1,
      maxResultsShorts: 1,
      maxResultsVideos: 1,
    }),
  },
  x: {
    id: "easyapi~twitter-x-video-downloader",
    input: (url: string) => ({ links: [url] }),
  },
} satisfies Record<
  SocialPlatform,
  { id: string; input: (url: string) => ActorInput }
>;

function normalizedActorError(item: ApifyItem): string | undefined {
  if (item.noResults === true) {
    return "This social post could not be found. It may have been deleted or the link is invalid.";
  }

  const error = getString(item, ["error", "errorMessage", "message"]);
  if (!error) return undefined;

  const normalized = error.toLowerCase();
  if (
    normalized.includes("restricted") ||
    normalized.includes("private") ||
    normalized.includes("login_required") ||
    normalized.includes("login required")
  ) {
    return "This content is restricted and cannot be accessed. Try a different public post.";
  }
  if (
    normalized.includes("not_found") ||
    normalized.includes("not found") ||
    normalized.includes("unavailable") ||
    normalized.includes("deleted") ||
    normalized.includes("removed")
  ) {
    return "This social post could not be found. It may have been deleted or the link is invalid.";
  }

  return undefined;
}

async function toSocialContent(
  platform: SocialPlatform,
  url: string,
  item: ApifyItem,
): Promise<SocialContent> {
  const imageUrls = collectMediaImages(item);
  const thumbnailUrl = imageUrls[0];
  const audioUrl =
    platform === "instagram" ? getString(item, ["audioUrl"]) : undefined;
  const caption = getCaption(platform, item);
  const transcript =
    extractActorTranscript(item) ?? (await tryFetchSubtitles(item));
  const videoUrl = getVideoUrl(platform, item);
  const durationSeconds = getDurationSeconds(item);

  const content: SocialContent = {
    platform,
    url,
    imageUrls,
  };

  if (caption) content.caption = caption;
  if (transcript) content.transcript = transcript;
  if (videoUrl) content.videoUrl = videoUrl;
  if (thumbnailUrl) content.thumbnailUrl = thumbnailUrl;
  if (durationSeconds !== undefined) content.durationSeconds = durationSeconds;
  if (audioUrl) content.isAudio = true;

  return content;
}

async function runApifyActor(
  actorId: string,
  input: ActorInput,
): Promise<Response> {
  const endpoint = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
  const headers = { "Content-Type": "application/json" };
  const body = JSON.stringify(input);

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers, body });
      if (res.ok) return res;

      const errorBody = await res.text();
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw new FatalApifyError(`Apify error: ${res.status} — ${errorBody}`);
      }
      if (attempt === RETRY_ATTEMPTS) {
        throw new Error(
          `Apify error after ${RETRY_ATTEMPTS} attempts: ${res.status} — ${errorBody}`,
        );
      }
      throw new Error(`Apify error: ${res.status} — ${errorBody}`);
    } catch (caughtError) {
      if (caughtError instanceof FatalApifyError) throw caughtError;
      if (attempt === RETRY_ATTEMPTS) throw caughtError;
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * attempt),
      );
    }
  }

  throw new Error("Apify: all retry attempts exhausted");
}

function normalizeXItem(item: ApifyItem): ApifyItem {
  const result = item.result;
  if (!isRecord(result)) return item;

  if (result.error === true) {
    return { error: "not_found" };
  }

  const medias = Array.isArray(result.medias) ? result.medias : [];
  let videoUrl: string | undefined;
  let duration: number | undefined;

  for (const media of medias) {
    if (!isRecord(media)) continue;
    const ext = getString(media, ["extension"]);
    if (ext && ext !== "mp4") continue;
    videoUrl = getString(media, ["url"]);
    if (typeof media.duration === "number")
      duration = Math.round(media.duration);
    break;
  }

  return {
    fullText: getString(result, ["title"]),
    thumbnailUrl: getString(result, ["thumbnail"]),
    videoUrl,
    duration,
  };
}

export async function fetchSocialContent(url: string): Promise<SocialContent> {
  if (!process.env.APIFY_TOKEN) throw new Error("APIFY_TOKEN not configured");

  const platform = getSocialPlatform(url);
  if (!platform) throw new Error("Unsupported social platform");

  const actor = ACTOR_BY_PLATFORM[platform];
  const res = await runApifyActor(actor.id, actor.input(url));
  const items = (await res.json()) as unknown;
  if (!Array.isArray(items) || !isRecord(items[0])) {
    throw new Error("Apify returned no items for this social URL");
  }

  const rawItem = items[0];
  const item = platform === "x" ? normalizeXItem(rawItem) : rawItem;
  const actorError = normalizedActorError(item);
  if (actorError) throw new Error(actorError);

  return await toSocialContent(platform, url, item);
}
