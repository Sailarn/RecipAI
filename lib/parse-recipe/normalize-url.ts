// Only tracking-only params — dropping a content-bearing param would collapse different recipes onto the same cache key.
const TRACKING_PARAMS = new Set([
  "igshid",
  "igsh",
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "yclid",
  "twclid",
  "mc_cid",
  "mc_eid",
  "si",
  "s",
  "t",
  "_r",
  "_ga",
]);

function isTrackingParam(key: string): boolean {
  return key.startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase());
}

export function normalizeSourceUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return rawUrl.trim();
  }

  const host = parsed.hostname
    .toLowerCase()
    .replace(/^(www\.|m\.|mobile\.)/, "");

  // Instagram: /reel/, /reels/, /p/, /tv/ all share the same shortcode — collapse to one key.
  if (host === "instagram.com") {
    const media = parsed.pathname.match(/^\/(?:reel|reels|p|tv)\/([^/]+)/);
    if (media) return `https://instagram.com/reel/${media[1]}`;
  }

  if (host === "youtube.com") {
    const short = parsed.pathname.match(/^\/shorts\/([^/]+)/);
    const videoId = short?.[1] ?? parsed.searchParams.get("v");
    if (videoId) return `https://youtube.com/watch?v=${videoId}`;
  }

  if (host === "youtu.be") {
    const videoId = parsed.pathname.match(/^\/([^/]+)/)?.[1];
    if (videoId) return `https://youtube.com/watch?v=${videoId}`;
  }

  if (host === "tiktok.com" && parsed.pathname.includes("/video/")) {
    const path = parsed.pathname.replace(/\/+$/, "");
    return `https://tiktok.com${path}`;
  }

  if (host === "x.com" || host === "twitter.com") {
    const status = parsed.pathname.match(/^\/([^/]+)\/status\/([^/]+)/);
    if (status) return `https://x.com/${status[1]}/status/${status[2]}`;
  }

  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams) {
    if (!isTrackingParam(key)) params.append(key, value);
  }
  params.sort();
  const query = params.toString();

  const path = parsed.pathname.replace(/\/+$/, "") || "/";

  return `https://${host}${path}${query ? `?${query}` : ""}`;
}
