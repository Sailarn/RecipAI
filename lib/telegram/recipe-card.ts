import { isImageKitUrl } from "@/lib/imagekit-url";
import { miniAppDeepLink } from "@/lib/telegram-bot";

// The shared shape behind every Telegram recipe card — the share flow's prepared
// inline message and the bot's parse-completion message both render from this, so
// a recipient sees one consistent card regardless of how it reached them.
export interface RecipeCardData {
  id: string;
  title: string;
  category?: string | null;
  totalTime?: number | null;
  servings: number;
  ingredientCount: number;
  imageUrl?: string | null;
}

export type InlineKeyboardMarkup = {
  inline_keyboard: { text: string; url: string }[][];
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function recipeCardStats(data: RecipeCardData): string {
  return [
    data.totalTime ? `⏱ ${data.totalTime} min` : null,
    `🍽 ${data.servings} serving${data.servings === 1 ? "" : "s"}`,
    `🧂 ${data.ingredientCount} ingredient${data.ingredientCount === 1 ? "" : "s"}`,
  ]
    .filter((part): part is string => part !== null)
    .join("  ·  ");
}

// Telegram photo cards need a fetchable JPEG within its size limits — the app's
// getOptimizedUrl forces webp, which Telegram rejects. Non-ImageKit sources are
// passed through unchanged.
export function telegramPhotoUrl(imageUrl: string): string {
  return isImageKitUrl(imageUrl) ? `${imageUrl}?tr=w-800,f-jpg,q-80` : imageUrl;
}

export function recipeCardButton(recipeId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🍳 Open recipe", url: miniAppDeepLink(`recipe_${recipeId}`) }],
    ],
  };
}

// Everything a recipient reads in the chat message. Telegram can't render the
// app's card styling here, so pack the info into a formatted caption. Kept
// deliberately short — optional header + title + meta, no description — because
// the description made the pre-send share sheet tall enough to push its controls
// off-screen (recipes can have a long, multi-line title). The "Open recipe"
// button carries the rest. `header` (e.g. "✅ Saved to RecipAI") frames the
// completion message; the share card omits it.
export function recipeCardCaption(
  data: RecipeCardData,
  header?: string,
): string {
  const meta = [
    data.category ? escapeHtml(data.category) : null,
    recipeCardStats(data),
  ]
    .filter((part): part is string => part !== null)
    .join("  ·  ");

  return [header ?? null, `🍳 <b>${escapeHtml(data.title)}</b>`, meta]
    .filter((part): part is string => part !== null)
    .join("\n");
}
