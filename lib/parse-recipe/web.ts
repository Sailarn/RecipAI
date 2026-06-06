import * as cheerio from "cheerio";
import { extractSchemaRecipe } from "@/app/api/parse-recipe/schema-parser";
import { callAiForRecipe } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { fetchHtmlWithPhantomJs } from "@/lib/scrapers/phantomjs";
import { fetchHtmlWithScrapeDo } from "@/lib/scrapers/scrape-do";
import {
  buildImagesText,
  extractAllImages,
  extractHeroImage,
  extractStepImages,
} from "./images";
import { buildWebPrompt } from "./prompts";

// Chrome-trim tuning: a "block" this large that is mostly link text is treated
// as site navigation (menus, footers) and dropped, since recipe prose has low
// link density. The floor guards against gutting an unusual layout.
const CHROME_MIN_BLOCK_CHARS = 200;
const CHROME_LINK_RATIO = 0.6;
const MIN_TRIMMED_CHARS = 300;
const MIN_TRIMMED_RATIO = 0.1;

function bodyText($: cheerio.CheerioAPI): string {
  return $("body").text().replace(/\s+/g, " ").trim();
}

/**
 * Remove large, link-dense blocks (nav menus, footers) so we don't spend tokens
 * on site chrome. Mutates the document. Prose-heavy recipe content survives
 * because its link-to-text ratio is low.
 */
export function trimChrome($: cheerio.CheerioAPI): void {
  $("ul, ol, nav, header, footer, div").each((_, element) => {
    const block = $(element);
    const textLength = block.text().replace(/\s+/g, " ").trim().length;
    if (textLength < CHROME_MIN_BLOCK_CHARS) return;
    const linkLength = block
      .find("a")
      .text()
      .replace(/\s+/g, " ")
      .trim().length;
    if (linkLength / textLength > CHROME_LINK_RATIO) block.remove();
  });
}

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
        (instruction, index) => ({
          ...instruction,
          imageUrl: stepImages[index] || undefined,
        }),
      );
    }
    return { ...schemaRecipe, sourceUrl: url } as ParsedRecipe;
  }

  // AI fallback path
  $("script, style, noscript, svg").remove();

  // Pull images from the full page before trimming chrome away.
  const hero = extractHeroImage($);
  const allImages = extractAllImages($);

  const fullText = bodyText($);
  trimChrome($);
  const trimmedText = bodyText($);

  // Use the trimmed text only when it still looks like a real page; otherwise
  // fall back to the full text so an odd layout can't be gutted.
  const usableText =
    trimmedText.length >= MIN_TRIMMED_CHARS &&
    trimmedText.length >= fullText.length * MIN_TRIMMED_RATIO
      ? trimmedText
      : fullText;

  let textContent = usableText.slice(0, 25000);

  if (textContent.length < 100) {
    throw new Error("Could not extract enough text from page");
  }

  if (allImages.length > 0) {
    textContent = `PAGE IMAGES:\n${buildImagesText(allImages)}\n\n${textContent}`;
  }
  if (hero) {
    textContent = `Hero image URL: ${hero}\n\n${textContent}`;
  }

  const recipe = await callAiForRecipe(
    buildWebPrompt(textContent, userComment),
  );
  return { ...recipe, sourceUrl: url };
}
