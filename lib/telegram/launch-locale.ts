import { type Locale, locales } from "@/i18n/config";
import { CLOUD_PREF_KEYS, getCloudItem } from "./cloud-storage";
import type { TelegramWebApp } from "./webapp";

/**
 * Seeds the Mini App locale from the user's Telegram UI language. Ukrainian
 * (`uk`) and English (`en`) map to themselves; Russian (`ru`) falls to
 * Ukrainian; anything else falls to English. Note Telegram uses ISO `uk` for
 * Ukrainian while the app's locale is `ua`.
 */
export function localeFromTelegramLanguage(
  languageCode: string | undefined,
): Locale {
  const code = (languageCode ?? "").toLowerCase();
  if (code.startsWith("uk")) return "ua";
  if (code.startsWith("en")) return "en";
  if (code.startsWith("ru")) return "ua";
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
  if (stored && locales.includes(stored as Locale)) return stored as Locale;
  return localeFromTelegramLanguage(webApp.initDataUnsafe.user?.language_code);
}
