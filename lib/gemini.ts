import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

// Fallback chain: if a model hits 429/503, the next one is tried.
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
] as const;

function getModel(modelName: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });
}

function isRetryable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("503") ||
    message.includes("429") ||
    message.includes("Service Unavailable") ||
    message.includes("Too Many Requests")
  );
}

async function withModelFallback<T>(
  callModel: (modelName: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const modelName of MODEL_CHAIN) {
    try {
      return await callModel(modelName);
    } catch (caughtError) {
      lastError = caughtError;
      if (!isRetryable(caughtError)) throw caughtError; // non-retryable: fail immediately
      logger.warn(`[Gemini] ${modelName} unavailable, trying next model...`);
    }
  }
  throw lastError;
}

function parseGeminiJson<T>(result: { response: { text: () => string } }): T {
  try {
    return JSON.parse(result.response.text()) as T;
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
}

export async function callGeminiForRecipe(
  prompt: string,
): Promise<ParsedRecipe> {
  const result = await withModelFallback((modelName) =>
    getModel(modelName).generateContent(prompt),
  );
  return parseGeminiJson<ParsedRecipe>(result);
}

export async function callGeminiForIngredient(
  prompt: string,
): Promise<Record<string, unknown>> {
  const result = await withModelFallback((modelName) =>
    getModel(modelName).generateContent(prompt),
  );
  return parseGeminiJson<Record<string, unknown>>(result);
}

export async function callGeminiForRecipePhoto(
  imageBase64: string,
  mimeType: string,
  prompt: string,
): Promise<ParsedRecipe> {
  const result = await withModelFallback((modelName) =>
    getModel(modelName).generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      { text: prompt },
    ]),
  );
  return parseGeminiJson<ParsedRecipe>(result);
}
