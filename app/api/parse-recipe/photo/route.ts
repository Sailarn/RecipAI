import { callGeminiForRecipePhoto } from "@/lib/gemini";
import { buildPhotoPrompt } from "@/lib/parse-recipe/prompts";

export async function POST(request: Request) {
  try {
    const { imageBase64, mimeType, userComment } = await request.json();

    if (!imageBase64 || !mimeType) {
      return Response.json(
        { error: "imageBase64 and mimeType are required" },
        { status: 400 },
      );
    }

    const prompt = buildPhotoPrompt(userComment);
    const recipe = await callGeminiForRecipePhoto(
      imageBase64,
      mimeType,
      prompt,
    );

    return Response.json(recipe);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
