export const locales = ["en", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "uk";

/**
 * Ukrainian was `ua` until it became the real language code `uk` (`ua` is a
 * country code, so `Intl` fell back to English plural rules). Old links,
 * cookies and stored preferences still carry it.
 */
export const LEGACY_UKRAINIAN_LOCALE = "ua";

/** A stored or linked locale value as a supported locale, or null. */
export function toLocale(value: string | null | undefined): Locale | null {
  if (value === LEGACY_UKRAINIAN_LOCALE) return "uk";
  return locales.find((locale) => locale === value) ?? null;
}

/** Native display name for each locale — used in UI without needing translations. */
export const LOCALE_DISPLAY_NAME: Record<Locale, string> = {
  en: "English",
  uk: "Українська",
} as const;
