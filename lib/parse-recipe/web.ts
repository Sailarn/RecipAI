import * as cheerio from "cheerio";
import { type AiRecipeCaller, callAiForRecipe } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { fetchHtmlWithPhantomJs } from "@/lib/scrapers/phantomjs";
import { fetchHtmlWithScrapeDo } from "@/lib/scrapers/scrape-do";
import { log } from "@/lib/telemetry";
import { buildImagesText, extractAllImages, extractHeroImage } from "./images";
import { buildWebPrompt } from "./prompts";
import { requireCompleteRecipe } from "./recipe-result";

// Chrome-trim tuning: a "block" this large that is mostly link text is treated
// as site navigation (menus, footers) and dropped, since recipe prose has low
// link density. The floor guards against gutting an unusual layout.
const CHROME_MIN_BLOCK_CHARS = 200;
const CHROME_LINK_RATIO = 0.6;
const MIN_TRIMMED_CHARS = 300;
const MIN_TRIMMED_RATIO = 0.1;
const MAX_JSON_LD_CONTEXT_CHARS = 12000;

// Injectable so the local model-eval harness can substitute a local Playwright
// render instead of burning PhantomJS/scrape.do credits on every test run.
export type HtmlFetcher = (url: string) => Promise<{
  html: string;
  scraper: string;
}>;

async function defaultHtmlFetcher(
  url: string,
): Promise<{ html: string; scraper: string }> {
  try {
    return { html: await fetchHtmlWithPhantomJs(url), scraper: "phantomjs" };
  } catch (phantomJsError) {
    log("warn", "phantomjs_fallback", {
      url,
      error:
        phantomJsError instanceof Error
          ? phantomJsError.message
          : String(phantomJsError),
    });
    return { html: await fetchHtmlWithScrapeDo(url), scraper: "scrape-do" };
  }
}

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

function hasRecipeType(value: unknown): boolean {
  if (typeof value === "string") return value === "Recipe";
  return Array.isArray(value) && value.includes("Recipe");
}

function collectRecipeNodes(value: unknown, recipes: object[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectRecipeNodes(item, recipes);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  if (hasRecipeType(record["@type"])) {
    recipes.push(record);
    return;
  }
  for (const nested of Object.values(record))
    collectRecipeNodes(nested, recipes);
}

export function extractJsonLdContext($: cheerio.CheerioAPI): string {
  const recipes: object[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      collectRecipeNodes(JSON.parse($(element).text()), recipes);
    } catch {
      // Ignore malformed metadata and keep parsing the visible page.
    }
  });
  return recipes
    .map((recipe) => JSON.stringify(recipe))
    .join("\n")
    .slice(0, MAX_JSON_LD_CONTEXT_CHARS);
}

// Structured per-parse record for Axiom: which path served the recipe (instant
// schema vs. paid AI), which scraper fired, and how long each took. Powers the
// pipeline performance/cost dashboard — see docs/explanation/observability.md.
function logParsePipeline(
  url: string,
  scraper: string,
  scrapeMs: number,
  startedAt: number,
  recipe: ParsedRecipe,
): void {
  let domain: string | undefined;
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = undefined;
  }
  const ingredientCount = recipe.ingredients?.length ?? 0;
  const stepCount = recipe.instructions?.length ?? 0;
  log("info", "parse_pipeline", {
    source: "url",
    domain,
    // Every URL parse goes through the AI now; the schema.org fast path was
    // removed because its structured data silently dropped ingredients.
    path: "ai",
    scraper,
    scrape_ms: scrapeMs,
    total_ms: Date.now() - startedAt,
    ingredient_count: ingredientCount,
    step_count: stepCount,
    // Reflect actual completeness rather than hardcoding true — requireCompleteRecipe
    // already rejects 0/0 before this log, but keep the field honest as a backstop.
    success: ingredientCount > 0 && stepCount > 0,
  });
}

export async function parseWebRecipe(
  url: string,
  aiCaller: AiRecipeCaller = callAiForRecipe,
  htmlFetcher: HtmlFetcher = defaultHtmlFetcher,
): Promise<ParsedRecipe> {
  const startedAt = Date.now();
  const scrapeStartedAt = Date.now();
  const { html, scraper } = await htmlFetcher(url);
  const scrapeMs = Date.now() - scrapeStartedAt;

  const $ = cheerio.load(html);
  const jsonLdContext = extractJsonLdContext($);

  // All URL parses go through the AI: the schema.org fast path was removed
  // because a site's structured data can silently omit ingredients (a wrong
  // recipe is worse than a slower one), and the AI reads the whole page.
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
  if (jsonLdContext) {
    textContent = `SCHEMA.ORG RECIPE CONTEXT (reference only; verify against page text):\n${jsonLdContext}\n\n${textContent}`;
  }

  const recipe = requireCompleteRecipe(
    await aiCaller(buildWebPrompt(textContent)),
    "page",
    { url },
  );
  const aiResult = { ...recipe, sourceUrl: url };
  logParsePipeline(url, scraper, scrapeMs, startedAt, aiResult);
  return aiResult;
}
