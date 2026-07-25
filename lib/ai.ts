import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RecipeExtractionResult } from "@/lib/parse-recipe/recipe-result";
import { log, trackEvent } from "@/lib/telemetry";

// Try every free Gemini model in turn; then DeepSeek for recipe (web/video)
// parses only — DeepSeek's chat API has no image input, so photo parses skip
// straight past it to OpenAI; only if ALL of those fail do we fall back to
// the paid OpenAI model — keeping cost on the free tier whenever possible.
const GEMINI_MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
] as const;
// The faster/cheaper tier — deepseek-v4-pro measured meaningfully slower in
// side-by-side model testing (scripts/local/model-eval), too slow to be
// worth it this late in an already-degraded fallback chain.
const DEEPSEEK_MODEL = "deepseek-v4-flash";
const OPENAI_MODEL = "gpt-4o-mini";
const DEEPSEEK_FALLBACK_INDEX = GEMINI_MODEL_CHAIN.length;
const OPENAI_FALLBACK_INDEX = GEMINI_MODEL_CHAIN.length + 1;
// Neither DeepSeek nor OpenAI had an explicit timeout before — a hung
// request would block a queued parse job indefinitely. 90s gives real
// headroom (observed DeepSeek chat-tier latency: well under 60s) without
// blocking a background job forever.
const HTTP_PROVIDER_TIMEOUT_MS = 90_000;

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

async function callOpenAiCompatibleJson<T>(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: OpenAiMessage[],
  providerLabel: string,
): Promise<T> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages,
    }),
    signal: AbortSignal.timeout(HTTP_PROVIDER_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `${providerLabel} error: ${response.status} — ${await response.text()}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${providerLabel} returned no content`);
  return parseJson<T>(content, providerLabel);
}

async function callOpenAiJson<T>(messages: OpenAiMessage[]): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");
  return callOpenAiCompatibleJson(
    "https://api.openai.com/v1",
    apiKey,
    OPENAI_MODEL,
    messages,
    "OpenAI",
  );
}

async function callDeepSeekJson<T>(messages: OpenAiMessage[]): Promise<T> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API key not configured");
  return callOpenAiCompatibleJson(
    "https://api.deepseek.com",
    apiKey,
    DEEPSEEK_MODEL,
    messages,
    "DeepSeek",
  );
}

/**
 * Run the recipe-extraction prompt through the model chain: every free Gemini
 * model first, then DeepSeek for recipe (web/video) parses only (skipped for
 * photo — no vision support — and only when a DEEPSEEK_API_KEY is set), then
 * OpenAI as a last resort (only when an OPENAI_API_KEY is set).
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

  if (context === "recipe" && process.env.DEEPSEEK_API_KEY) {
    trackEvent("ai_fallback_to_deepseek", { context });
    const startedAt = Date.now();
    try {
      const parsed = await callDeepSeekJson<T>(openAiMessages);
      log("info", "ai_call", {
        model: DEEPSEEK_MODEL,
        context,
        duration_ms: Date.now() - startedAt,
        success: true,
        fallback_index: DEEPSEEK_FALLBACK_INDEX,
      });
      return parsed;
    } catch (deepSeekError) {
      lastError = deepSeekError;
      log("warn", "ai_call", {
        model: DEEPSEEK_MODEL,
        context,
        duration_ms: Date.now() - startedAt,
        success: false,
        fallback_index: DEEPSEEK_FALLBACK_INDEX,
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
        fallback_index: OPENAI_FALLBACK_INDEX,
      });
      return parsed;
    } catch (openAiError) {
      lastError = openAiError;
      log("error", "ai_call", {
        model: OPENAI_MODEL,
        context,
        duration_ms: Date.now() - startedAt,
        success: false,
        fallback_index: OPENAI_FALLBACK_INDEX,
      });
    }
  }

  throw lastError;
}

export type AiRecipeCaller = (
  prompt: string,
) => Promise<RecipeExtractionResult>;

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
