import type { Recipe } from "@/lib/db/schema";
import {
  getOptimizedUrl,
  HERO_IMAGE_WIDTH,
  isImageKitUrl,
} from "@/lib/imagekit-url";

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

// Deduped across calls so remounting the list (e.g. returning to the Recipes
// tab) never re-issues prewarm requests for images already scheduled.
const prewarmed = new Set<string>();

function scheduleIdle(callback: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    window.setTimeout(callback, 200);
  }
}

/**
 * Warm each recipe's detail hero image into the service-worker cache during
 * idle time, so opening a recipe shows its photo instantly — even one never
 * scrolled to. Sequential + idle-scheduled so it never competes with user
 * interaction. The exact hero URL is requested, so it hits the same cache entry
 * RecipeHero later renders.
 */
export function prewarmRecipeImages(recipes: Recipe[]): void {
  if (typeof window === "undefined") return;
  const urls = selectPrewarmUrls(recipes).filter((url) => !prewarmed.has(url));
  if (urls.length === 0) return;

  let index = 0;
  const warmNext = () => {
    if (index >= urls.length) return;
    const url = urls[index];
    index += 1;
    prewarmed.add(url);
    const image = new Image();
    image.onload = () => scheduleIdle(warmNext);
    image.onerror = () => scheduleIdle(warmNext);
    image.src = url;
  };
  scheduleIdle(warmNext);
}
