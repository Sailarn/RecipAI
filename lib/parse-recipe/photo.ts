import { apiFetch } from "@/lib/api/api-fetch";
import type { ParsedRecipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";

export async function compressImage(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const MAX_DIMENSION = 1024;
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get canvas 2d context");
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.85,
  });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function parseRecipeFromPhoto(
  file: File,
  jobId: string,
): Promise<ParsedRecipe> {
  const { base64, mimeType } = await compressImage(file);

  const res = await apiFetch(api.parseRecipePhoto, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, jobId }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
    const message: string = error || "Parse failed";
    if (
      message.includes("503") ||
      message.includes("Service Unavailable") ||
      message.includes("high demand")
    ) {
      throw new Error(
        "Gemini is experiencing high demand right now. Please try again in a moment.",
      );
    }
    if (
      message.includes("429") ||
      message.includes("Too Many Requests") ||
      message.includes("quota")
    ) {
      throw new Error("API quota exceeded. Please try again later.");
    }
    throw new Error(message);
  }

  return res.json() as Promise<ParsedRecipe>;
}
