import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  // `external-auth` is excluded: those pages live outside the [locale] tree
  // (no locale prefix), so the i18n middleware must not redirect them to
  // /<locale>/external-auth, which 404s.
  matcher: ["/((?!api|ingest|_next|_vercel|external-auth|.*\\..*).*)"],
};
