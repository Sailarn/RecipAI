export {
  defaultLocale,
  LOCALE_DISPLAY_NAME,
  type Locale,
  locales,
} from "./config";

import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { type Locale, locales } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  if (!locale || !locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
