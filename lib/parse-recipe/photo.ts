import type { ParsedRecipe } from "@/lib/db/schema";
import { api } from "@/lib/routes";

export async function compressImage(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const MAX = 1024;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2d context");
  ctx.drawImage(bitmap, 0, 0, w, h);
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
  userComment?: string,
): Promise<ParsedRecipe> {
  const { base64, mimeType } = await compressImage(file);

  const res = await fetch(api.parseRecipePhoto, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: base64, mimeType, userComment }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
    const msg: string = error || "Parse failed";
    if (
      msg.includes("503") ||
      msg.includes("Service Unavailable") ||
      msg.includes("high demand")
    ) {
      throw new Error(
        "Gemini is experiencing high demand right now. Please try again in a moment.",
      );
    }
    if (
      msg.includes("429") ||
      msg.includes("Too Many Requests") ||
      msg.includes("quota")
    ) {
      throw new Error("API quota exceeded. Please try again later.");
    }
    throw new Error(msg);
  }

  return res.json() as Promise<ParsedRecipe>;
}
