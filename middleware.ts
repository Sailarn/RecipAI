import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n/request";

export default createMiddleware({
  // List of all supported locales
  locales,

  // Default locale
  defaultLocale,

  // Don't use locale prefix for default locale
  // /recipes instead of /ua/recipes for Ukrainian
  localePrefix: "as-needed",
});

export const config = {
  // Match all pathnames except static files and API routes
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
