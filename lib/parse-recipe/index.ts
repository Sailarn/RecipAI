import type { ParsedRecipe } from "@/lib/db/schema";
import { isSocialUrl } from "@/lib/video-url";
import { parseVideoRecipe } from "./video";
import { parseWebRecipe } from "./web";

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  if (isSocialUrl(url)) {
    return parseVideoRecipe(url);
  }
  return parseWebRecipe(url);
}
