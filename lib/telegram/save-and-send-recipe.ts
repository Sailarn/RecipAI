import { ApiError } from "@/lib/api-errors";
import type { ParsedRecipe } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { saveParsedRecipeForUser } from "@/lib/parse-recipe/save-parsed-recipe-server";
import {
  type InlineKeyboardMarkup,
  type RecipeCardData,
  recipeCardButton,
  recipeCardCaption,
  telegramPhotoUrl,
} from "@/lib/telegram/recipe-card";
import { sendTelegramMessage, sendTelegramPhoto } from "@/lib/telegram-bot";
import { isImageKitUrl } from "@/lib/upload/images";

interface SendRecipeCardOptions {
  chatId: number | string;
  imageUrl: string | null | undefined;
  caption: string;
  replyMarkup: InlineKeyboardMarkup;
}

// Delivers the saved-recipe card, degrading to text whenever the photo can't be
// sent. A non-ImageKit URL means the mirror upload failed and this is the
// (likely expired) source CDN URL, which Telegram usually can't fetch either —
// so skip straight to text. Telegram can also reject an ImageKit URL it fails
// to fetch with a 400; the recipe is already saved by this point, so falling
// back to text delivers the notification instead of dropping it.
async function sendRecipeCard({
  chatId,
  imageUrl,
  caption,
  replyMarkup,
}: SendRecipeCardOptions): Promise<void> {
  if (imageUrl && isImageKitUrl(imageUrl)) {
    try {
      await sendTelegramPhoto(
        chatId,
        telegramPhotoUrl(imageUrl),
        caption,
        replyMarkup,
      );
      return;
    } catch (photoError) {
      logger.warn("[telegram] recipe card photo send failed", photoError);
    }
  }
  await sendTelegramMessage(chatId, caption, replyMarkup);
}

interface SaveAndSendRecipeOptions {
  userId: string;
  chatId: number | string;
  parsed: ParsedRecipe;
  sourceUrl: string | null;
  req?: Request;
}

/**
 * Saves a parse result straight into the user's library (or finds the recipe
 * already imported from that link) and messages them the recipe card — the
 * completion path for every Telegram-originated parse. A failed save throws; a
 * failed message does not, since the recipe is saved by then and reporting the
 * parse as failed would be wrong.
 */
export async function saveAndSendRecipe({
  userId,
  chatId,
  parsed,
  sourceUrl,
  req,
}: SaveAndSendRecipeOptions): Promise<void> {
  const { recipeId, alreadySaved } = await saveParsedRecipeForUser({
    userId,
    parsed,
    sourceUrl,
  });

  const cardData: RecipeCardData = {
    id: recipeId,
    title: parsed.title,
    category: parsed.category ?? null,
    totalTime: (parsed.prepTime || 0) + (parsed.cookTime || 0) || null,
    servings: parsed.servings ?? null,
    ingredientCount: parsed.ingredients?.length ?? 0,
    imageUrl: parsed.imageUrl ?? null,
  };

  try {
    await sendRecipeCard({
      chatId,
      imageUrl: cardData.imageUrl,
      caption: recipeCardCaption(
        cardData,
        alreadySaved ? "📚 Already in RecipAI" : "✅ Saved to RecipAI",
      ),
      replyMarkup: recipeCardButton(recipeId),
    });
  } catch (notifyError) {
    ApiError.capture(notifyError, req);
  }
}
