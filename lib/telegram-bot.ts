const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// The Mini App's short name in @BotFather (the `<app>` in t.me/<bot>/<app>).
const MINI_APP_NAME = "recipai";

type InlineKeyboardMarkup = {
  inline_keyboard: { text: string; url: string }[][];
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: InlineKeyboardMarkup,
): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    }),
  });
}

/** Deep link that opens the Mini App at a `startapp` target (e.g. `recipe_<id>`). */
export function miniAppDeepLink(startParam: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  return `https://t.me/${botUsername}/${MINI_APP_NAME}?startapp=${startParam}`;
}

/**
 * Prepares an inline message the user can share into a chat via
 * `WebApp.shareMessage(id)` (Bot API 8.0). Returns the prepared message id, or
 * null if Telegram rejected the request.
 */
export async function savePreparedInlineMessage(
  userId: string,
  result: Record<string, unknown>,
): Promise<string | null> {
  const res = await fetch(`${TELEGRAM_API}/savePreparedInlineMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: Number(userId),
      result,
      allow_user_chats: true,
      allow_group_chats: true,
      allow_channel_chats: true,
    }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    result?: { id?: string };
  };
  return data.ok && data.result?.id ? data.result.id : null;
}

export function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0] : null;
}
