import type { AiRecipeCaller } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { isSocialUrl } from "@/lib/video-url";
import { parseVideoRecipe } from "./video";
import { type HtmlFetcher, parseWebRecipe } from "./web";

// htmlFetcher only ever arrives alongside aiCaller (the model-eval harness
// supplies both together to substitute a local scraper) — no call site needs
// htmlFetcher without an aiCaller, so that combination isn't forwarded.
export async function parseRecipeFromUrl(
  url: string,
  aiCaller?: AiRecipeCaller,
  htmlFetcher?: HtmlFetcher,
): Promise<ParsedRecipe> {
  if (isSocialUrl(url)) {
    return aiCaller ? parseVideoRecipe(url, aiCaller) : parseVideoRecipe(url);
  }
  if (aiCaller && htmlFetcher)
    return parseWebRecipe(url, aiCaller, htmlFetcher);
  return aiCaller ? parseWebRecipe(url, aiCaller) : parseWebRecipe(url);
}
