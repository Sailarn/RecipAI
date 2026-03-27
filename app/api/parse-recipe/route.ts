import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";
import { type NextRequest, NextResponse } from "next/server";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";
import { extractSchemaRecipe } from "./schema-parser"; // ← NEW

export async function POST(request: NextRequest) {
  try {
    const { url, userComment } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const token = process.env.SCRAPE_DO_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Scraping service not configured. Please add SCRAPE_DO_TOKEN to .env.local",
        },
        { status: 500 },
      );
    }

    // Fetch HTML
    const scrapeUrl = `http://api.scrape.do/?token=${token}&url=${encodeURIComponent(url)}&render=true`;
    console.log("Fetching with scrape.do:", url);

    const response = await fetch(scrapeUrl, {
      method: "GET",
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      console.error("Scrape.do error:", response.status, response.statusText);
      return NextResponse.json(
        {
          error: `Failed to fetch page: ${response.statusText}`,
          status: response.status,
        },
        { status: 400 },
      );
    }

    const html = await response.text();
    console.log("HTML fetched, length:", html.length);

    // ========== NEW: TRY SCHEMA.ORG FIRST ==========
    console.log("Attempting schema.org extraction...");
    const schemaRecipe = extractSchemaRecipe(html);

    if (schemaRecipe && schemaRecipe.ingredients.length > 0) {
      console.log("✅ Schema.org extraction successful:", schemaRecipe.title);

      // Add sourceUrl
      schemaRecipe.sourceUrl = url;

      return NextResponse.json({
        success: true,
        provider: "schema.org",
        scraper: "scrape.do",
        recipe: schemaRecipe,
      });
    }

    console.log("❌ Schema.org not found or incomplete, falling back to AI...");
    // ========== END NEW SECTION ==========

    // ========== FALLBACK: USE GEMINI AI ==========

    // Use Cheerio to clean HTML
    const $ = cheerio.load(html);
    // Try selectors in order, less aggressive removal
    $("script, style, noscript, svg").remove();

    // Extract main content (try multiple selectors)
    let textContent = "";
    textContent = $("body").text();
    textContent = textContent.replace(/\s+/g, " ").trim().slice(0, 25000);
    console.log("Extracted text length:", textContent.length);

    if (textContent.length < 100) {
      return NextResponse.json(
        {
          error: `Could not extract enough text from page (only ${textContent.length} chars). The page might be heavily JavaScript-rendered.`,
          extractedLength: textContent.length,
        },
        { status: 400 },
      );
    }
    console.log("before gemini", textContent);
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 },
      );
    }

    // Extract first meaningful image URL
let heroImage = "";
$('img').each((_, el) => {
  const src = $(el).attr('src') || $(el).attr('data-src') || '';
  const width = parseInt($(el).attr('width') || '0');
  const height = parseInt($(el).attr('height') || '0');
  const alt = $(el).attr('alt') || '';
  const cls = $(el).attr('class') || '';

  // Skip logos, icons, sprites
  if (!src.startsWith('http')) return;
  if (src.includes('logo') || src.includes('icon') || src.includes('sprite')) return;
  if (cls.includes('logo') || cls.includes('icon')) return;
  if (alt.toLowerCase().includes('logo')) return;
  // Skip small images
  if ((width > 0 && width < 200) || (height > 0 && height < 200)) return;

  heroImage = src;
  return false; // take first match
});
if (heroImage) {
  textContent = `Hero image URL: ${heroImage}\n\n${textContent}`;
}
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are a strict recipe data extraction expert. Extract structured recipe data from the provided <webpage_content>.

RULES:
- If a field cannot be logically found, output null — never guess or fabricate.
- Times (prepTime, cookTime) MUST be integers representing minutes (e.g., 1 hour 30 mins -> 90).
- For ingredients: isolate amount, unit, and item name. Convert fractions to decimals (e.g., "1 1/2" -> 1.5, "¼" -> 0.25).
- For servings: if a range is given (e.g., "4-6"), extract the lower bound integer (4).
- For instructions: extract in correct order, keep original wording, remove blog commentary.
- imageUrl: ONLY the primary hero image URL.
- If an ingredient appears without an amount in the text, set amount to null and unit to null — do not invent "1" as the amount
- cookTime: look for patterns like "35 хв", "1 год 30 хв", "45 minutes" near the recipe title. Convert to minutes (e.g., "1 год 30 хв" -> 90, "35 хв" -> 35).
${userComment ? `\nUSER OVERRIDE (CRITICAL): ${userComment}\n` : ""}
OUTPUT this exact JSON structure:
{
  "title": "string",
  "description": "string | null",
  "prepTime": "number | null",
  "cookTime": "number | null",
  "servings": "number | null",
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

    console.log("Calling Gemini...");

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    console.log("Gemini response received");

    let recipe: ParsedRecipe;
    try {
      recipe = JSON.parse(aiResponse);
      // Add sourceUrl
      recipe.sourceUrl = url;

      console.log("Successfully parsed recipe:", recipe.title);

      return NextResponse.json({
        success: true,
        provider: "gemini",
        scraper: "scrape.do",
        recipe,
      });
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse recipe",
        success: false,
      },
      { status: 500 },
    );
  }
}
