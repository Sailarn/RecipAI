// Instagram's cdninstagram.com / fbcdn.net edges (and some other hotlink-guarded
// CDNs) answer a bare server-side fetch — one sending Node's default user agent
// and no referer — with a 403 or an HTML block page. That made the ImageKit
// upload fail, so recipes kept the *expiring* source URL and the image broke
// within hours. Browser-like headers make the CDN serve the actual image bytes.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";

export function imageFetchHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": BROWSER_USER_AGENT,
    Accept: IMAGE_ACCEPT,
  };
  // Instagram media is served from cdninstagram.com / fbcdn.net and checks the
  // referer against instagram.com for hotlink protection.
  if (url.includes("cdninstagram.com") || url.includes("fbcdn.net")) {
    headers.Referer = "https://www.instagram.com/";
  }
  return headers;
}
