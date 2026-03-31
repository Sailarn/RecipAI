import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { extractSchemaRecipe } from "@/app/api/parse-recipe/schema-parser";

export async function parseRecipeFromUrl(
  url: string,
  userComment?: string,
): Promise<ParsedRecipe> {
  const token = process.env.SCRAPE_DO_TOKEN;
  if (!token) throw new Error("Scraping service not configured");

  const scrapeUrl = `http://api.scrape.do/?token=${token}&url=${encodeURIComponent(url)}&render=true`;
  const response = await fetch(scrapeUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.statusText}`);
  }

  const html = await response.text();

  // Try schema.org first
  const schemaRecipe = extractSchemaRecipe(html);
  if (schemaRecipe && schemaRecipe.ingredients.length > 0) {
    return { ...schemaRecipe, sourceUrl: url } as ParsedRecipe;
  }

  // Fallback to Gemini
  if (!process.env.GEMINI_API_KEY)
    throw new Error("Gemini API key not configured");

  const $ = cheerio.load(html);
  $("script, style, noscript, svg").remove();

  let textContent = $("body").text();
  textContent = textContent.replace(/\s+/g, " ").trim().slice(0, 25000);

  if (textContent.length < 100) {
    throw new Error("Could not extract enough text from page");
  }

  let heroImage = "";
  $("img").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    const width = parseInt($(el).attr("width") || "0");
    const height = parseInt($(el).attr("height") || "0");
    const alt = $(el).attr("alt") || "";
    const cls = $(el).attr("class") || "";

    if (!src.startsWith("http")) return;
    if (src.includes("logo") || src.includes("icon") || src.includes("sprite"))
      return;
    if (cls.includes("logo") || cls.includes("icon")) return;
    if (alt.toLowerCase().includes("logo")) return;
    if ((width > 0 && width < 200) || (height > 0 && height < 200)) return;

    heroImage = src;
    return false;
  });

  if (heroImage) {
    textContent = `Hero image URL: ${heroImage}\n\n${textContent}`;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `You are a strict recipe data extraction expert. Extract structured recipe data from the provided <webpage_content>.

RULES:
- If a field cannot be logically found, output null — never guess or fabricate.
- Times (prepTime, cookTime) MUST be integers representing minutes (e.g., 1 hour 30 mins -> 90).
- For ingredients: isolate amount, unit, and item name. Convert fractions to decimals (e.g., "1 1/2" -> 1.5, "¼" -> 0.25).
- For servings: if a range is given (e.g., "4-6"), extract the lower bound integer (4).
- For instructions: extract in correct order, keep original wording, remove blog commentary.
- imageUrl: ONLY the primary hero image URL.
- If an ingredient appears without an amount in the text, set amount to null and unit to null — do not invent "1" as the amount.
- cookTime: look for patterns like "35 хв", "1 год 30 хв", "45 minutes" near the recipe title. Convert to minutes.
- category: pick the single best fit from this list: Breakfast, Lunch, Dinner, Soup, Salad, Snack, Dessert, Baking, Drink, Other. Never return null.
${userComment ? `\nUSER OVERRIDE (CRITICAL): ${userComment}\n` : ""}
OUTPUT this exact JSON structure:
{
  "title": "string",
  "description": "string | null",
  "prepTime": "number | null",
  "cookTime": "number | null",
  "servings": "number | null",
  "category": "Breakfast | Lunch | Dinner | Soup | Salad | Snack | Dessert | Baking | Drink | Other",
  "ingredients": [{ "amount": "number | null", "unit": "string | null", "item": "string" }],
  "instructions": [{ "order": "number", "instruction": "string" }],
  "imageUrl": "string | null"
}

IMPORTANT - This page uses Ukrainian format where ingredients appear as "item — amount unit" (e.g., "Фетучині — 250 г").
Extract ingredients in this format correctly: item name first, then amount and unit after the dash.
Also extract ingredients embedded in step text formatted as "item — amount unit, item — amount unit Step text here...
<webpage_content>
${textContent}
</webpage_content>`;

  const result = await model.generateContent(prompt);
  const aiResponse = result.response.text();

  let recipe: ParsedRecipe;
  try {
    recipe = JSON.parse(aiResponse);
    recipe.sourceUrl = url;
    return recipe;
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}
