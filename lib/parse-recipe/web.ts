import * as cheerio from "cheerio";
import { extractSchemaRecipe } from "@/app/api/parse-recipe/schema-parser";
import type { ParsedRecipe } from "@/lib/db/schema";
import { callGeminiForRecipe } from "@/lib/gemini";
import { fetchHtmlWithPhantomJs } from "@/lib/scrapers/phantomjs";
import { fetchHtmlWithScrapeDo } from "@/lib/scrapers/scrape-do";
import {
  buildImagesText,
  extractAllImages,
  extractHeroImage,
  extractStepImages,
} from "./images";
import { buildWebPrompt } from "./prompts";

export async function parseWebRecipe(
  url: string,
  userComment?: string,
): Promise<ParsedRecipe> {
  let html: string;
  try {
    html = await fetchHtmlWithPhantomJs(url);
  } catch {
    html = await fetchHtmlWithScrapeDo(url);
  }

  const $ = cheerio.load(html);
  const stepImages = extractStepImages($);

  // try schema.org first — instant if found
  const schemaRecipe = extractSchemaRecipe(html);
  if (schemaRecipe && schemaRecipe.ingredients.length > 0) {
    if (stepImages.length > 0) {
      schemaRecipe.instructions = schemaRecipe.instructions.map(
        (inst, idx) => ({
          ...inst,
          imageUrl: stepImages[idx] || undefined,
        }),
      );
    }
    return { ...schemaRecipe, sourceUrl: url } as ParsedRecipe;
  }

  // Gemini fallback
  $("script, style, noscript, svg").remove();
  let textContent = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25000);

  if (textContent.length < 100) {
    throw new Error("Could not extract enough text from page");
  }

  const hero = extractHeroImage($);
  const allImages = extractAllImages($);

  if (allImages.length > 0) {
    textContent = `PAGE IMAGES:\n${buildImagesText(allImages)}\n\n${textContent}`;
  }
  if (hero) {
    textContent = `Hero image URL: ${hero}\n\n${textContent}`;
  }

  const recipe = await callGeminiForRecipe(
    buildWebPrompt(textContent, userComment),
  );
  return { ...recipe, sourceUrl: url };
}
