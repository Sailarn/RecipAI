export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "x";

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function normalizedHost(parsedUrl: URL): string {
  return parsedUrl.hostname.toLowerCase().replace(/^(www\.|m\.|mobile\.)/, "");
}

export function getSocialPlatform(url: string): SocialPlatform | null {
  const parsedUrl = parseUrl(url);
  if (!parsedUrl) return null;

  const host = normalizedHost(parsedUrl);
  const path = parsedUrl.pathname;

  if (host === "instagram.com" && /^\/(?:reel|reels|p|tv)\//i.test(path)) {
    return "instagram";
  }
  if (host === "tiktok.com" && path.includes("/video/")) {
    return "tiktok";
  }
  if (
    host === "youtube.com" &&
    (/^\/shorts\/[^/]+/i.test(path) || parsedUrl.searchParams.has("v"))
  ) {
    return "youtube";
  }
  if (host === "youtu.be" && /^\/[^/]+/i.test(path)) {
    return "youtube";
  }
  if (
    (host === "x.com" || host === "twitter.com") &&
    /\/status\//i.test(path)
  ) {
    return "x";
  }

  return null;
}

export function isSocialUrl(url: string): boolean {
  return getSocialPlatform(url) !== null;
}

// YouTube only — Instagram/TikTok thumbnails require auth
export function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match
    ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`
    : null;
}

export function isInstagramUrl(url: string): boolean {
  return getSocialPlatform(url) === "instagram";
}
