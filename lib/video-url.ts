const VIDEO_PATTERNS = [
  /instagram\.com\/(reel|p)\//i,
  /tiktok\.com\//i,
  /youtube\.com\/shorts\//i,
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
];

export function isVideoUrl(url: string): boolean {
  return VIDEO_PATTERNS.some((p) => p.test(url));
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
  return /instagram\.com\/(reel|p)\//i.test(url);
}

export function isUnsupportedVideoUrl(url: string): boolean {
  return /tiktok\.com\//i.test(url);
}
