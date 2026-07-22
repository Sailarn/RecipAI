import type { PublicRecipe } from "@/lib/public-recipes/types";
import {
  type RecipeCardData,
  recipeCardButton,
  recipeCardCaption,
  recipeCardStats,
  telegramPhotoUrl,
} from "./recipe-card";

function cardData(recipe: PublicRecipe): RecipeCardData {
  return {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category ?? null,
    totalTime: recipe.totalTime ?? null,
    servings: recipe.servings,
    ingredientCount: recipe.ingredients.length,
    imageUrl: recipe.imageUrl ?? null,
  };
}

/**
 * Builds the InlineQueryResult shared into a chat for a public recipe. Uses a
 * photo card (recipe image + info-rich caption) when the recipe has an image,
 * else an article card. The button deep-links to the recipe in the Mini App.
 * Shares the caption/button/photo builders with the bot's parse-completion
 * message (see `recipe-card.ts`), so both surfaces render one consistent card.
 */
export function buildRecipeInlineResult(
  recipe: PublicRecipe,
): Record<string, unknown> {
  const data = cardData(recipe);
  const caption = recipeCardCaption(data);
  const stats = recipeCardStats(data);
  const replyMarkup = recipeCardButton(recipe.id);

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
