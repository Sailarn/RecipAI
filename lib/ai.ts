import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RecipeExtractionResult } from "@/lib/parse-recipe/recipe-result";
import { log, trackEvent } from "@/lib/telemetry";

// Try every free Gemini model in turn; only if they ALL fail do we fall back to
// the paid OpenAI model — keeping cost on the free tier whenever possible.
const GEMINI_MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
] as const;
const OPENAI_MODEL = "gpt-4o-mini";

type AiContext = "recipe" | "ingredient" | "photo";

type GeminiContents =
  | string
  | Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    >;

type OpenAiContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type OpenAiMessage = { role: "user"; content: string | OpenAiContent[] };

function parseJson<T>(text: string, provider: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${provider} returned invalid JSON`);
  }
}

function getModel(modelName: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });
}

async function callGeminiJson<T>(
  modelName: string,
  contents: GeminiContents,
): Promise<T> {
  const result = await getModel(modelName).generateContent(contents);
  return parseJson<T>(result.response.text(), "Gemini");
}

async function callOpenAiJson<T>(messages: OpenAiMessage[]): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI error: ${response.status} — ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  return parseJson<T>(content, "OpenAI");
}

/**
 * Run the recipe-extraction prompt through the model chain: every free Gemini
 * model first, then OpenAI as a last resort (only when an OPENAI_API_KEY is set).
 */
async function generateJson<T>(
  geminiContents: GeminiContents,
  openAiMessages: OpenAiMessage[],
  context: AiContext,
): Promise<T> {
  let lastError: unknown;

  for (const [fallbackIndex, modelName] of GEMINI_MODEL_CHAIN.entries()) {
    const startedAt = Date.now();
    try {
      const parsed = await callGeminiJson<T>(modelName, geminiContents);
      log("info", "ai_call", {
        model: modelName,
        context,
        duration_ms: Date.now() - startedAt,
        success: true,
        fallback_index: fallbackIndex,
      });
      return parsed;
    } catch (caughtError) {
      lastError = caughtError;
      log("warn", "ai_call", {
        model: modelName,
        context,
        duration_ms: Date.now() - startedAt,
        success: false,
        fallback_index: fallbackIndex,
      });
    }
  }

  if (process.env.OPENAI_API_KEY) {
    trackEvent("ai_fallback_to_openai", { context });
    const startedAt = Date.now();
    try {
      const parsed = await callOpenAiJson<T>(openAiMessages);
      log("info", "ai_call", {
        model: OPENAI_MODEL,
        context,
        duration_ms: Date.now() - startedAt,
        success: true,
        fallback_index: GEMINI_MODEL_CHAIN.length,
      });
      return parsed;
    } catch (openAiError) {
      lastError = openAiError;
      log("error", "ai_call", {
        model: OPENAI_MODEL,
        context,
        duration_ms: Date.now() - startedAt,
        success: false,
        fallback_index: GEMINI_MODEL_CHAIN.length,
      });
    }
  }

  throw lastError;
}

export async function callAiForRecipe(
  prompt: string,
): Promise<RecipeExtractionResult> {
  return generateJson<RecipeExtractionResult>(
    prompt,
    [{ role: "user", content: prompt }],
    "recipe",
  );
}

export async function callAiForIngredient(
  prompt: string,
): Promise<Record<string, unknown>> {
  return generateJson<Record<string, unknown>>(
    prompt,
    [{ role: "user", content: prompt }],
    "ingredient",
  );
}

export async function callAiForRecipePhoto(
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<RecipeExtractionResult> {
  return generateJson<RecipeExtractionResult>(
    [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }],
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    "photo",
  );
}
