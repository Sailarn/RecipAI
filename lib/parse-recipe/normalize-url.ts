// Query params that never identify recipe content — safe to drop so the same
// recipe URL shared through different channels collapses to one cache key.
//
// Deliberately conservative: a *missed* param only lowers the cache-hit rate
// (harmless — you just re-parse), but dropping a *content-bearing* param would
// collapse two different recipes onto one key and serve the wrong one. So this
// list holds only params that are never content, and the path/host are left
// case-sensitive where a host might encode an id (e.g. Instagram reel slugs).
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
  "_ga",
]);

function isTrackingParam(key: string): boolean {
  return key.startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase());
}

// Normalize a recipe source URL into a stable cache key: lowercase host (with
// `www.`/`m.` folded off), tracking params stripped, remaining params sorted,
// trailing slash and fragment dropped, scheme forced to https. Path case is
// preserved (slugs can be case-sensitive). Returns the trimmed input unchanged
// if it doesn't parse as a URL, so it still works as a key.
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

  // Instagram serves the same media (a globally-unique shortcode) under
  // /reel/, /reels/, /p/ and /tv/ — collapse them to one key and drop the
  // all-tracking query so every share of a reel hits the same cache entry.
  if (host === "instagram.com") {
    const media = parsed.pathname.match(/^\/(?:reel|reels|p|tv)\/([^/]+)/);
    if (media) return `https://instagram.com/reel/${media[1]}`;
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
