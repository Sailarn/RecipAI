import type { AiRecipeCaller } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { isSocialUrl } from "@/lib/video-url";
import { parseVideoRecipe } from "./video";
import { parseWebRecipe } from "./web";

export async function parseRecipeFromUrl(
  url: string,
  aiCaller?: AiRecipeCaller,
): Promise<ParsedRecipe> {
  if (isSocialUrl(url)) {
    return aiCaller ? parseVideoRecipe(url, aiCaller) : parseVideoRecipe(url);
  }
  return aiCaller ? parseWebRecipe(url, aiCaller) : parseWebRecipe(url);
}
