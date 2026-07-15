import type { Recipe } from "@/lib/db/schema";
import {
  getOptimizedUrl,
  HERO_IMAGE_WIDTH,
  isImageKitUrl,
} from "@/lib/imagekit-url";
import { scheduleIdle } from "@/lib/schedule-idle";

/**
 * Hero-size ImageKit URLs for the given recipes: deduped, with non-ImageKit and
 * empty sources dropped. Pure — the testable core of prewarming.
 */
export function selectPrewarmUrls(recipes: Recipe[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const recipe of recipes) {
    if (!isImageKitUrl(recipe.imageUrl)) continue;
    const url = getOptimizedUrl(recipe.imageUrl, HERO_IMAGE_WIDTH);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

// Bulk idle-prewarm only covers a small leading batch (recipes arrive in the
// list's current sort order, so this is normally "most recent"). Warming an
// entire library on every visit would spend real bandwidth/battery on photos
// the user may never open — the rest rely on prewarmRecipeImage() firing on
// actual pointer/focus intent instead.
const BULK_PREWARM_CAP = 12;

// Only a *successful* load is remembered. A failed one is not — so a later
// call (e.g. returning to the tab after connectivity improves) can retry it,
// rather than being silently blocked forever.
const succeeded = new Set<string>();

function isSlowConnection(): boolean {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return false;
  return (
    connection.saveData === true ||
    connection.effectiveType === "slow-2g" ||
    connection.effectiveType === "2g"
  );
}

function warmOne(url: string, onSettled: () => void): void {
  const image = new Image();
  image.onload = () => {
    succeeded.add(url);
    onSettled();
  };
  image.onerror = () => onSettled();
  image.src = url;
}

// Sequential, idle-scheduled, and paused entirely while the tab is hidden —
// a backgrounded tab has no business spending the user's data/battery.
function warmQueue(urls: string[]): void {
  let index = 0;
  const runNext = () => {
    if (index >= urls.length) return;
    if (document.visibilityState === "hidden") {
      document.addEventListener("visibilitychange", resume, { once: true });
      return;
    }
    const url = urls[index];
    index += 1;
    warmOne(url, () => scheduleIdle(runNext));
  };
  const resume = () => scheduleIdle(runNext);
  scheduleIdle(runNext);
}

/**
 * Warm a small leading batch of hero images into the service-worker cache
 * during idle time, so opening one of them shows its photo instantly. Skips
 * entirely on a data-saver / slow connection, and pauses while the tab is
 * hidden. Capped and idle-scheduled — see BULK_PREWARM_CAP.
 */
export function prewarmRecipeImages(recipes: Recipe[]): void {
  if (typeof window === "undefined" || isSlowConnection()) return;
  const urls = selectPrewarmUrls(recipes)
    .filter((url) => !succeeded.has(url))
    .slice(0, BULK_PREWARM_CAP);
  if (urls.length === 0) return;
  warmQueue(urls);
}

/**
 * Warm a single recipe's hero image immediately — call on pointer-down/focus
 * of a card so the photo for the recipe the user is about to open is ready
 * before RecipeDetail mounts. No idle delay, no cap; still skipped on a
 * data-saver / slow connection.
 */
export function prewarmRecipeImage(recipe: Recipe): void {
  if (typeof window === "undefined" || isSlowConnection()) return;
  if (!isImageKitUrl(recipe.imageUrl)) return;
  const url = getOptimizedUrl(recipe.imageUrl, HERO_IMAGE_WIDTH);
  if (succeeded.has(url)) return;
  const image = new Image();
  image.onload = () => succeeded.add(url);
  image.src = url;
}
