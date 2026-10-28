import { type Locale, toLocale } from "@/i18n/config";
import { CLOUD_PREF_KEYS, getCloudItem } from "./cloud-storage";
import type { TelegramWebApp } from "./webapp";

/**
 * Seeds the Mini App locale from the user's Telegram UI language. Ukrainian
 * (`uk`) and English (`en`) map to themselves; Russian (`ru`) falls to
 * Ukrainian; anything else falls to English.
 */
export function localeFromTelegramLanguage(
  languageCode: string | undefined,
): Locale {
  const code = (languageCode ?? "").toLowerCase();
  if (code.startsWith("uk")) return "uk";
  if (code.startsWith("en")) return "en";
  if (code.startsWith("ru")) return "uk";
  return "en";
}

/**
 * The locale to open the Mini App in: the user's explicit stored choice wins;
 * with none, seed from the Telegram UI language. The seed is recomputed each
 * launch (never stored), so it keeps tracking the Telegram language until the
 * user picks one — an explicit choice is the only thing written to CloudStorage.
 */
export async function resolveLaunchLocale(
  webApp: TelegramWebApp,
): Promise<Locale> {
  const stored = await getCloudItem(CLOUD_PREF_KEYS.locale);
  return (
    toLocale(stored) ??
    localeFromTelegramLanguage(webApp.initDataUnsafe.user?.language_code)
  );
}
