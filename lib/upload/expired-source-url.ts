// Social CDNs sign image URLs with an expiry in the query string. Past it the
// request doesn't fail fast — Instagram's CDN just hangs until the browser
// gives up — so a card holding such a URL sat blank for ~30s before falling
// back to the placeholder. Reading the expiry lets the UI skip the request.
//   Instagram / Facebook (fbcdn.net, cdninstagram.com): `oe` = hex unix seconds
//   TikTok (tiktokcdn*.com): `x-expires` = decimal unix seconds
function expiresAtSeconds(url: URL): number | null {
  const host = url.hostname;
  if (host.endsWith("fbcdn.net") || host.endsWith("cdninstagram.com")) {
    const hex = url.searchParams.get("oe");
    return hex && /^[0-9a-f]+$/i.test(hex) ? Number.parseInt(hex, 16) : null;
  }
  if (host.includes("tiktokcdn")) {
    const seconds = url.searchParams.get("x-expires");
    return seconds && /^\d+$/.test(seconds) ? Number(seconds) : null;
  }
  return null;
}

/** True only when the URL carries a known CDN expiry that has passed. */
export function isExpiredSourceUrl(rawUrl: string, now = Date.now()): boolean {
  if (!URL.canParse(rawUrl)) return false;
  const expiresAt = expiresAtSeconds(new URL(rawUrl));
  return expiresAt !== null && expiresAt * 1000 <= now;
}
