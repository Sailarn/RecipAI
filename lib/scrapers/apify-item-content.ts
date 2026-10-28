import type { SocialPlatform } from "@/lib/video-url";
import {
  type ApifyItem,
  addUnique,
  collectTextFromArray,
  getNestedNumber,
  getNestedString,
  getNumber,
  getString,
  isRecord,
  stringArray,
} from "./apify-item-fields";

// What a social post contributes to a parse — caption, images, video,
// duration, transcript — read out of one actor item.

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

export function collectMediaImages(item: ApifyItem): string[] {
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

export function getCaption(
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

export function extractActorTranscript(item: ApifyItem): string | undefined {
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

export function getVideoUrl(
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

export function getDurationSeconds(item: ApifyItem): number | undefined {
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

export async function tryFetchSubtitles(
  item: ApifyItem,
): Promise<string | undefined> {
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
