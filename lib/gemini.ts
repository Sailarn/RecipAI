import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedRecipe } from "@/app/[locale]/recipes/parse/page";

export async function callGeminiForRecipe(
  prompt: string,
): Promise<ParsedRecipe> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(prompt);

  try {
    return JSON.parse(result.response.text()) as ParsedRecipe;
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
}
