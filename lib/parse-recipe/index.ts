import type { ParsedRecipe } from "@/lib/types";
import { isVideoUrl } from "@/lib/video-url";
import { parseVideoRecipe } from "./video";
import { parseWebRecipe } from "./web";

export async function parseRecipeFromUrl(
  url: string,
  userComment?: string,
): Promise<ParsedRecipe> {
  if (isVideoUrl(url)) {
    return parseVideoRecipe(url, userComment);
  }
  return parseWebRecipe(url, userComment);
}
