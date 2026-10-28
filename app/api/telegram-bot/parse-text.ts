import { ApiError } from "@/lib/api-errors";
import { executeDirectParseJob } from "@/lib/parse-recipe/direct-parse-job";
import { extractRecipeFromText } from "@/lib/parse-recipe/text-extract";
import { saveAndSendRecipe } from "@/lib/telegram/save-and-send-recipe";
import { sendTelegramMessage } from "@/lib/telegram-bot";
import { classifyParseError } from "../parse-queue/process/helpers";

interface ParseTextForChatOptions {
  text: string;
  userId: string;
  chatId: number;
}

// Runs after the webhook has answered Telegram: parse the text, save it to the
// user's library, and message the recipe card — or the reason it failed.
export async function parseRecipeTextForChat({
  text,
  userId,
  chatId,
}: ParseTextForChatOptions): Promise<void> {
  try {
    const parsed = await executeDirectParseJob({
      jobId: crypto.randomUUID(),
      userId,
      source: "text",
      telegramChatId: String(chatId),
      extract: () => extractRecipeFromText(text),
    });
    await saveAndSendRecipe({ userId, chatId, parsed, sourceUrl: null });
  } catch (error) {
    ApiError.capture(error);
    await sendTelegramMessage(chatId, classifyParseError(error));
  }
}
