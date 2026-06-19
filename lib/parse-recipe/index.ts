import type { ParsedRecipe } from "@/lib/db/schema";
import { isVideoUrl } from "@/lib/video-url";
import { parseVideoRecipe } from "./video";
import { parseWebRecipe } from "./web";

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  if (isVideoUrl(url)) {
    return parseVideoRecipe(url);
  }
  return parseWebRecipe(url);
}
