// `/parse_text` — Telegram command names allow only [a-z0-9_], so no hyphen.
export const PARSE_TEXT_COMMAND = "parse_text";

// Sent with force_reply when /parse_text arrives without text. A reply to this
// exact message is treated as the recipe text.
export const PARSE_TEXT_PROMPT =
  "📝 Paste the recipe text as a reply to this message.";

const COMMAND_PATTERN = new RegExp(
  `^/${PARSE_TEXT_COMMAND}(?:@\\w+)?(?=\\s|$)`,
);

export interface BotTextMessage {
  text?: string;
  reply_to_message?: { text?: string; from?: { is_bot?: boolean } };
}

export type ParseTextRequest =
  | { kind: "ask-for-text" }
  | { kind: "parse"; text: string };

/**
 * What a message asks of the text parser: nothing (null), "send me the text"
 * (a bare /parse_text), or the recipe text itself — either after the command
 * or as a reply to the bot's prompt. Text is never auto-detected: only the
 * explicit command or a reply to its prompt routes to text parsing.
 */
export function parseTextRequest(
  message: BotTextMessage,
): ParseTextRequest | null {
  const text = message.text ?? "";
  const command = text.match(COMMAND_PATTERN);
  if (command) {
    const recipeText = text.slice(command[0].length).trim();
    return recipeText
      ? { kind: "parse", text: recipeText }
      : { kind: "ask-for-text" };
  }

  const repliesToPrompt =
    message.reply_to_message?.from?.is_bot === true &&
    message.reply_to_message.text === PARSE_TEXT_PROMPT;
  if (repliesToPrompt && text.trim()) {
    return { kind: "parse", text: text.trim() };
  }
  return null;
}
