import { PARSE_ERROR_MESSAGES } from "./friendly-parse-error";
import { PHOTO_IMPORT_TITLE, TEXT_IMPORT_TITLE } from "./parse-history-entry";

/**
 * English texts that reach the UI from stored history, the server, or the bot
 * flow, keyed by their `parse.messages.*` translation. They are stored in
 * English, so they are translated where they are shown, not where written.
 */
export const PARSE_MESSAGES = {
  ...PARSE_ERROR_MESSAGES,
  photoImport: PHOTO_IMPORT_TITLE,
  textImport: TEXT_IMPORT_TITLE,
} as const;

export type ParseMessageKey = keyof typeof PARSE_MESSAGES;

const KEY_BY_TEXT = new Map<string, ParseMessageKey>(
  Object.entries(PARSE_MESSAGES).map(([key, text]) => [
    text,
    key as ParseMessageKey,
  ]),
);

/** The translation key for a known parse message, or null for any other text. */
export function parseMessageKey(text: string): ParseMessageKey | null {
  return KEY_BY_TEXT.get(text) ?? null;
}
