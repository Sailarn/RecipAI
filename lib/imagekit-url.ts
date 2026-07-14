// Read at call time (not module-load) so the NEXT_PUBLIC_ value still inlines in
// production builds while tests can override it with vi.stubEnv.
function imagekitEndpoint(): string {
  return process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";
}

// Width (px) the recipe detail hero requests. Kept here so idle prewarming
// fetches the exact URL the hero will later render (same cache entry).
export const HERO_IMAGE_WIDTH = 800;

/** True when the URL points at our ImageKit CDN endpoint. */
export function isImageKitUrl(url: string | undefined): url is string {
  const endpoint = imagekitEndpoint();
  return !!url && endpoint !== "" && url.startsWith(endpoint);
}

/**
 * Build a direct ImageKit CDN URL with on-the-fly resize/format transforms,
 * bypassing Next's /_next/image optimizer. This lets the service worker cache
 * recipe images (and lets us prewarm them) instead of routing every request
 * through Vercel's image optimizer. Non-ImageKit sources (e.g. the placeholder)
 * are returned unchanged. The full URL — transform params included — is the
 * cache key, so each size variant is cached separately.
 */
export function getOptimizedUrl(url: string, width: number): string {
  if (!isImageKitUrl(url)) return url;
  return `${url}?tr=w-${width},f-webp,q-80`;
}
