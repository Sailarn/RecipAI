import { defaultLocale, type Locale, toLocale } from "./config";

/**
 * Pick a supported locale from an `Accept-Language` header, for pages that
 * live outside the `[locale]` tree and are opened by a third party (the OAuth
 * pages an AI chat app sends the user to carry no `?locale=`). Honours `q`
 * weights; region subtags are ignored (`uk-UA` → `uk`).
 */
export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  if (!header) return defaultLocale;

  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number(qParam.trim().slice(2)) : 1;
      return {
        language: tag.trim().toLowerCase().split("-")[0],
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.language && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { language } of ranked) {
    const locale = toLocale(language);
    if (locale) return locale;
  }
  return defaultLocale;
}
