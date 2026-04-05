const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

interface ApifyReelResult {
  videoUrl?: string;
  audioUrl?: string;
  displayUrl?: string;
  caption?: string;
  error?: string;
}

function cleanCaption(caption: string): string {
  // trim everything from first hashtag onwards (promo text, tags)
  const hashIndex = caption.indexOf("#");
  const cleaned = hashIndex !== -1 ? caption.slice(0, hashIndex) : caption;
  return cleaned.trim();
}

async function runApifyActor(url: string): Promise<Response> {
  const endpoint = `https://api.apify.com/v2/acts/apify~instagram-reel-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`;
  const body = JSON.stringify({ username: [url], resultsLimit: 1 });
  const headers = { "Content-Type": "application/json" };

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers, body });
      if (res.ok) return res;

      const errorBody = await res.text();
      // don't retry on auth or not-found errors
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        throw new Error(`Apify error: ${res.status} — ${errorBody}`);
      }

      if (attempt === RETRY_ATTEMPTS) {
        throw new Error(
          `Apify error after ${RETRY_ATTEMPTS} attempts: ${res.status} — ${errorBody}`,
        );
      }

      console.log(
        `Apify attempt ${attempt} failed (${res.status}), retrying...`,
      );
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    } catch (err) {
      if (attempt === RETRY_ATTEMPTS) throw err;
      console.log(`Apify attempt ${attempt} threw, retrying:`, err);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }

  throw new Error("Apify: all retry attempts exhausted");
}

export async function fetchInstagramReel(url: string): Promise<{
  videoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  isAudio?: boolean;
}> {
  if (!process.env.APIFY_TOKEN) throw new Error("APIFY_TOKEN not configured");

  const res = await runApifyActor(url);
  const items = (await res.json()) as ApifyReelResult[];
  const item = items[0];

  if (!item?.videoUrl) {
    const reason = (item as any)?.error;
    if (reason === "restricted_page") {
      throw new Error(
        "This reel is restricted and cannot be accessed. Try a different video.",
      );
    }
    throw new Error("Apify returned no video URL for this reel");
  }

  return {
    videoUrl: item.audioUrl ?? item.videoUrl,
    isAudio: !!item.audioUrl,
    thumbnailUrl: item.displayUrl,
    caption: item.caption ? cleanCaption(item.caption) : undefined,
  };
}
