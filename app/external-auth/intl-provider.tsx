import { NextIntlClientProvider } from "next-intl";
import { defaultLocale, type Locale, locales } from "@/i18n/config";

/**
 * next-intl context for the `external-auth` tree.
 *
 * These pages live outside `app/[locale]`, so the middleware never assigns
 * them a locale and the layout can't read one (layouts don't receive
 * searchParams). Each page takes its locale from the `?locale=` the app put in
 * the link and wraps itself with this instead.
 */
export async function ExternalAuthIntlProvider({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const resolved: Locale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;
  const messages = (await import(`../../locales/${resolved}.json`)).default;

  return (
    <NextIntlClientProvider locale={resolved} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
