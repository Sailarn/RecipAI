import { GoogleGenerativeAI } from "@google/generative-ai";
import * as cheerio from "cheerio";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url, userComment } = await request.json();

    if (!url) {
      return NextResponse.json(
        {
          error: "URL is required",
        },
        { status: 400 },
      );
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

    // Use scrape.do to fetch the page
    const scrapeUrl = `http://api.scrape.do/?token=${token}&url=${encodeURIComponent(url)}`;

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

    // Use Cheerio to clean HTML
    const $ = cheerio.load(html);

    // Remove noise
    $(
      'script, style, nav, footer, header, aside, .ad, .comment, [class*="ad-"]',
    ).remove();

    // Extract main content (try multiple selectors)
    let textContent = "";
    if ($("main").length) {
      textContent = $("main").text();
    } else if ($("article").length) {
      textContent = $("article").text();
    } else if ($('[role="main"]').length) {
      textContent = $('[role="main"]').text();
    } else {
      textContent = $("body").text();
    }

    // Clean whitespace
    textContent = textContent.replace(/\s+/g, " ").trim().slice(0, 15000);

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

    // Call Gemini with JSON mode
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `Extract recipe data from this Ukrainian recipe page.

${userComment ? `User hint: ${userComment}\n\n` : ""}Return JSON with this exact structure:
{
  "title": "string",
  "description": "string or null",
  "prepTime": number or null (minutes),
  "cookTime": number or null (minutes),
  "servings": number,
  "ingredients": [
    {"amount": number or null, "unit": "string or null", "item": "string"}
  ],
  "instructions": [
    {"order": number, "instruction": "string"}
  ],
  "imageUrl": "string or null"
}

Recipe content:
${textContent}`;

    console.log("Calling Gemini...");

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

    console.log("Gemini response received");

    // Parse JSON
    const recipe = JSON.parse(aiResponse);

    // Add sourceUrl
    recipe.sourceUrl = url;

    console.log("Successfully parsed recipe:", recipe.title);

    return NextResponse.json({
      success: true,
      provider: "gemini",
      scraper: "scrape.do",
      recipe,
    });
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
