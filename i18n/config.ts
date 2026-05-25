export const locales = ["en", "ua"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ua";

/** Native display name for each locale — used in UI without needing translations. */
export const LOCALE_DISPLAY_NAME: Record<Locale, string> = {
  en: "English",
  ua: "Українська",
} as const;
