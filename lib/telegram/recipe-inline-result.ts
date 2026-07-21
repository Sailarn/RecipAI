import { isImageKitUrl } from "@/lib/imagekit-url";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { miniAppDeepLink } from "@/lib/telegram-bot";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function recipeStats(recipe: PublicRecipe): string {
  const ingredientCount = recipe.ingredients.length;
  return [
    recipe.totalTime ? `⏱ ${recipe.totalTime} min` : null,
    `🍽 ${recipe.servings} serving${recipe.servings === 1 ? "" : "s"}`,
    `🧂 ${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}`,
  ]
    .filter((part): part is string => part !== null)
    .join("  ·  ");
}

// Telegram photo cards need a fetchable JPEG within its size limits — the app's
// getOptimizedUrl forces webp, which Telegram rejects. Non-ImageKit sources are
// passed through unchanged.
function telegramPhotoUrl(imageUrl: string): string {
  return isImageKitUrl(imageUrl) ? `${imageUrl}?tr=w-800,f-jpg,q-80` : imageUrl;
}

// Everything a recipient reads in the chat message. Telegram can't render the
// app's card styling here, so pack the info into a formatted caption. Kept
// deliberately short — title + stats only — because the description made the
// pre-send share sheet tall enough to push its controls off-screen (recipes
// can have a long, multi-line title). The "Open recipe" button carries the rest.
function recipeCaption(recipe: PublicRecipe): string {
  const meta = [
    recipe.category ? escapeHtml(recipe.category) : null,
    recipeStats(recipe),
  ]
    .filter((part): part is string => part !== null)
    .join("  ·  ");

  return [`🍳 <b>${escapeHtml(recipe.title)}</b>`, meta].join("\n");
}

/**
 * Builds the InlineQueryResult shared into a chat for a public recipe. Uses a
 * photo card (recipe image + info-rich caption) when the recipe has an image,
 * else an article card. The button deep-links to the recipe in the Mini App.
 * Shared by the native share flow and (later) inline mode.
 * See specs/deep-tg/02-native-sharing.md.
 */
export function buildRecipeInlineResult(
  recipe: PublicRecipe,
): Record<string, unknown> {
  const deepLink = miniAppDeepLink(`recipe_${recipe.id}`);
  const caption = recipeCaption(recipe);
  const stats = recipeStats(recipe);
  const replyMarkup = {
    inline_keyboard: [[{ text: "🍳 Open recipe", url: deepLink }]],
  };

  if (recipe.imageUrl) {
    const photo = telegramPhotoUrl(recipe.imageUrl);
    return {
      type: "photo",
      id: crypto.randomUUID(),
      photo_url: photo,
      thumbnail_url: photo,
      title: recipe.title,
      description: stats,
      caption,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    };
  }

  return {
    type: "article",
    id: crypto.randomUUID(),
    title: recipe.title,
    description: stats,
    input_message_content: { message_text: caption, parse_mode: "HTML" },
    reply_markup: replyMarkup,
  };
}
