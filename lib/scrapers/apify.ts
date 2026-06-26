import { getSocialPlatform, type SocialPlatform } from "@/lib/video-url";

const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

class FatalApifyError extends Error {}

type ActorInput = Record<string, unknown>;
type ApifyItem = Record<string, unknown>;

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

function cleanCaption(caption: string): string {
  const lines = caption.trimEnd().split("\n");
  let lastContent = lines.length;
  while (
    lastContent > 0 &&
    /^(#\S+\s*)*$/.test(lines[lastContent - 1].trim())
  ) {
    lastContent--;
  }
  return lines.slice(0, lastContent).join("\n").trim();
}

function isRecord(value: unknown): value is ApifyItem {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(item: ApifyItem, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function getNestedString(
  item: ApifyItem,
  firstKey: string,
  secondKey: string,
): string | undefined {
  const nested = item[firstKey];
  if (!isRecord(nested)) return undefined;

  const value = nested[secondKey];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNumber(item: ApifyItem, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function getNestedNumber(
  item: ApifyItem,
  firstKey: string,
  secondKey: string,
): number | undefined {
  const nested = item[firstKey];
  return isRecord(nested) ? getNumber(nested, [secondKey]) : undefined;
}

function addUnique(values: string[], value: string | undefined) {
  if (value && !values.includes(value)) values.push(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim() !== "",
    )
    .map((entry) => entry.trim());
}

function collectTextFromArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  const lines = value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (!isRecord(entry)) return "";
      return getString(entry, ["text", "content", "caption"]) ?? "";
    })
    .filter(Boolean);

  return lines.length ? lines.join("\n") : undefined;
}

function collectMediaImages(item: ApifyItem): string[] {
  const images: string[] = [];

  for (const key of ["imageUrls", "images", "photos"]) {
    for (const imageUrl of stringArray(item[key])) addUnique(images, imageUrl);
  }

  for (const key of [
    "displayUrl",
    "thumbnailUrl",
    "thumbnail",
    "image",
    "coverUrl",
    "cover",
    "originCover",
    "dynamicCover",
  ]) {
    addUnique(images, getString(item, [key]));
  }

  addUnique(images, getNestedString(item, "covers", "default"));
  addUnique(images, getNestedString(item, "covers", "origin"));
  addUnique(images, getNestedString(item, "videoMeta", "coverUrl"));
  addUnique(images, getNestedString(item, "videoMeta", "originalCoverUrl"));

  const media = item.media;
  if (Array.isArray(media)) {
    for (const entry of media) {
      if (!isRecord(entry)) continue;
      const type = getString(entry, ["type"]);
      if (type === "video" || type === "animated_gif") {
        addUnique(
          images,
          getString(entry, [
            "media_url_https",
            "mediaUrlHttps",
            "previewUrl",
            "imageUrl",
            "thumbnail",
          ]),
        );
        continue;
      }
      if (type && type !== "photo" && type !== "image") continue;
      addUnique(
        images,
        getString(entry, [
          "url",
          "mediaUrl",
          "media_url_https",
          "mediaUrlHttps",
          "previewUrl",
          "imageUrl",
        ]),
      );
    }
  }

  const thumbnails = item.thumbnails;
  if (Array.isArray(thumbnails)) {
    for (const thumbnail of thumbnails) {
      if (typeof thumbnail === "string") {
        addUnique(images, thumbnail);
        continue;
      }
      if (isRecord(thumbnail)) {
        addUnique(images, getString(thumbnail, ["url", "imageUrl"]));
      }
    }
  }

  return images;
}

function getCaption(
  platform: SocialPlatform,
  item: ApifyItem,
): string | undefined {
  const caption = getString(item, [
    "caption",
    "fullText",
    "full_text",
    "tweetText",
    "text",
    "description",
    "desc",
  ]);
  const title = getString(item, ["title"]);

  const rawCaption =
    platform === "youtube" && title && caption
      ? `${title}\n\n${caption}`
      : title || caption;

  return rawCaption ? cleanCaption(rawCaption) : undefined;
}

function collectSubtitleField(value: unknown): string | undefined {
  if (Array.isArray(value)) return collectTextFromArray(value);
  // Some actors return subtitles as a language-keyed object: {uk: [...], en: [...]}
  if (isRecord(value)) {
    for (const track of Object.values(value)) {
      const text = collectTextFromArray(track);
      if (text) return text;
    }
  }
  return undefined;
}

function extractActorTranscript(item: ApifyItem): string | undefined {
  return (
    getString(item, ["transcript", "transcription"]) ??
    collectSubtitleField(item.subtitles) ??
    collectSubtitleField(item.captions)
  );
}

function getXVideoUrl(item: ApifyItem): string | undefined {
  const media = item.media;
  if (!Array.isArray(media)) return undefined;

  for (const entry of media) {
    if (!isRecord(entry)) continue;
    const type = getString(entry, ["type"]);
    if (type !== "video" && type !== "animated_gif") continue;

    const direct = getString(entry, ["url", "videoUrl", "video_url"]);
    if (direct) return direct;

    const videoInfo = entry.video_info;
    if (!isRecord(videoInfo)) continue;
    const variants = videoInfo.variants;
    if (!Array.isArray(variants)) continue;

    let bestUrl: string | undefined;
    let bestBitrate = -1;
    for (const variant of variants) {
      if (!isRecord(variant)) continue;
      const url = getString(variant, ["url"]);
      if (!url) continue;
      const contentType = getString(variant, ["content_type", "contentType"]);
      if (contentType === "application/x-mpegURL") continue;
      const bitrate = typeof variant.bitrate === "number" ? variant.bitrate : 0;
      if (bitrate > bestBitrate) {
        bestBitrate = bitrate;
        bestUrl = url;
      }
    }
    if (bestUrl) return bestUrl;
  }

  return undefined;
}

function getVideoUrl(
  platform: SocialPlatform,
  item: ApifyItem,
): string | undefined {
  if (platform === "instagram") {
    return getString(item, ["audioUrl"]) ?? getString(item, ["videoUrl"]);
  }
  if (platform === "x") {
    return getString(item, ["videoUrl"]) ?? getXVideoUrl(item);
  }

  return (
    getString(item, ["videoUrl", "video_url", "videoPlayAddr"]) ??
    getNestedString(item, "video", "url") ??
    getNestedString(item, "videoMeta", "downloadAddr")
  );
}

function parseDurationString(value: string): number | undefined {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return undefined;

  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return undefined;
}

function getDurationSeconds(item: ApifyItem): number | undefined {
  const seconds =
    getNumber(item, [
      "durationSeconds",
      "durationSecs",
      "lengthSeconds",
      "durationSec",
      "duration",
    ]) ??
    getNestedNumber(item, "videoMeta", "duration") ??
    getNestedNumber(item, "video", "duration");
  if (seconds !== undefined) return Math.round(seconds);

  const durationText = getString(item, ["duration", "length"]);
  return durationText ? parseDurationString(durationText) : undefined;
}

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

function parseWebVtt(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("WEBVTT")) return false;
      if (trimmed.startsWith("X-TIMESTAMP-MAP")) return false;
      if (/^\d{2}:\d{2}/.test(trimmed)) return false;
      if (/^\d+$/.test(trimmed)) return false;
      return true;
    })
    .map((line) => line.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .join("\n");
}

async function tryFetchSubtitles(item: ApifyItem): Promise<string | undefined> {
  const videoMeta = item.videoMeta;
  if (!isRecord(videoMeta)) return undefined;

  const links = videoMeta.subtitleLinks;
  if (!Array.isArray(links) || links.length === 0) return undefined;

  const first = links[0];
  if (!isRecord(first)) return undefined;

  const url = getString(first, ["downloadLink", "tiktokLink"]);
  if (!url) return undefined;

  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const text = await res.text();
    return parseWebVtt(text) || undefined;
  } catch {
    return undefined;
  }
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
