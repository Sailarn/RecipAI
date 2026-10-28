import { createTranslator } from "next-intl";
import { defaultLocale, type Locale, toLocale } from "@/i18n/config";
import { friendlyParseError } from "@/lib/parse-recipe/friendly-parse-error";
import { parseMessageKey } from "@/lib/parse-recipe/parse-message-key";
import type { PushPayload } from "@/lib/web-push";
import en from "@/locales/en.json";
import uk from "@/locales/uk.json";

const MESSAGES = { en, uk } as const;
const LOCALE_COOKIE = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/;

/**
 * The language of the device that started the parse, from next-intl's locale
 * cookie. A request without one — the bot, a server-side trigger — gets the
 * default.
 */
export function requestLocale(request: Request): Locale {
  const cookies = request.headers.get("cookie") ?? "";
  return toLocale(LOCALE_COOKIE.exec(cookies)?.[1]) ?? defaultLocale;
}

interface ParseDonePushInput {
  locale: Locale;
  title: string;
  /** A signed-in parse is already in the library; an anonymous one is not. */
  savedToLibrary: boolean;
  url: string;
}

export function parseDonePush({
  locale,
  title,
  savedToLibrary,
  url,
}: ParseDonePushInput): PushPayload {
  const t = createTranslator({ locale, messages: MESSAGES[locale] });
  return {
    title,
    body: t(savedToLibrary ? "push.savedBody" : "push.readyBody"),
    url,
  };
}

interface ParseFailedPushInput {
  locale: Locale;
  error: unknown;
  url: string;
}

export function parseFailedPush({
  locale,
  error,
  url,
}: ParseFailedPushInput): PushPayload {
  const t = createTranslator({ locale, messages: MESSAGES[locale] });
  const rawError = error instanceof Error ? error.message : String(error);
  const messageKey = parseMessageKey(friendlyParseError(rawError));
  return {
    title: t("push.failedTitle"),
    body: messageKey ? t(`parse.messages.${messageKey}`) : t("push.failedBody"),
    url,
  };
}
