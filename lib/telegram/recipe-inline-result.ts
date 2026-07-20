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
    recipe.totalTime ? `${recipe.totalTime} min` : null,
    `${recipe.servings} serving${recipe.servings === 1 ? "" : "s"}`,
    `${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"}`,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

/**
 * Builds the InlineQueryResult card shared into a chat for a public recipe. The
 * card's button deep-links to the recipe in the Mini App. Shared by the native
 * share flow and (later) inline mode. See specs/deep-tg/02-native-sharing.md.
 */
export function buildRecipeInlineResult(
  recipe: PublicRecipe,
): Record<string, unknown> {
  const deepLink = miniAppDeepLink(`recipe_${recipe.id}`);
  const stats = recipeStats(recipe);

  return {
    type: "article",
    id: crypto.randomUUID(),
    title: recipe.title,
    description: stats,
    ...(recipe.imageUrl ? { thumbnail_url: recipe.imageUrl } : {}),
    input_message_content: {
      message_text: `🍳 <b>${escapeHtml(recipe.title)}</b>\n${stats}`,
      parse_mode: "HTML",
    },
    reply_markup: {
      inline_keyboard: [[{ text: "🍳 Open recipe", url: deepLink }]],
    },
  };
}
