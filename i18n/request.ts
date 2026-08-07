export {
  defaultLocale,
  LOCALE_DISPLAY_NAME,
  type Locale,
  locales,
} from "./config";

import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, type Locale, locales } from "./config";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  // A locale segment that is not a locale is a 404 — but `app/[locale]/layout`
  // already rejects those before this runs, so this is the second line only.
  if (requested && !locales.includes(requested as Locale)) {
    notFound();
  }

  // No segment at all is NOT a bad locale, and 404ing it broke the whole
  // `external-auth` tree: those pages live outside `app/[locale]`, so nothing
  // ever assigns them one, and they pass their own locale to
  // ExternalAuthIntlProvider instead. Rendering that provider still resolves
  // this config for the values it does not carry (timeZone, formats), which
  // landed here with no locale and 404'd the device-approval and
  // account-linking pages — taking PWA Google sign-in down with them.
  const locale = requested ?? defaultLocale;

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
  };
});
