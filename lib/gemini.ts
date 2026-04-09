import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";

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

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("Service Unavailable") ||
    msg.includes("Too Many Requests")
  );
}

async function withModelFallback<T>(
  fn: (modelName: string) => Promise<T>,
): Promise<T> {
  let lastErr: unknown;
  for (const modelName of MODEL_CHAIN) {
    try {
      return await fn(modelName);
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) throw err; // non-retryable: fail immediately
      console.warn(`[Gemini] ${modelName} unavailable, trying next model...`);
    }
  }
  throw lastErr;
}

export async function callGeminiForRecipe(
  prompt: string,
): Promise<ParsedRecipe> {
  const result = await withModelFallback((modelName) =>
    getModel(modelName).generateContent(prompt),
  );
  try {
    return JSON.parse(result.response.text()) as ParsedRecipe;
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
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
  try {
    return JSON.parse(result.response.text()) as ParsedRecipe;
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
}
