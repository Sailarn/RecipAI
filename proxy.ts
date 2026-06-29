import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { ensureAppAvailable } from "@/lib/maintenance";
import { defaultLocale, locales } from "./i18n/config";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

const MAINTENANCE_EXEMPT_API_PREFIXES = ["/api/auth", "/api/manifest"];

function isExemptApiPath(pathname: string): boolean {
  return MAINTENANCE_EXEMPT_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    if (isExemptApiPath(pathname)) return NextResponse.next();

    const maintenance = await ensureAppAvailable();
    return maintenance ?? NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  // `external-auth` is excluded: those pages live outside the [locale] tree
  // (no locale prefix), so the i18n middleware must not redirect them to
  // /<locale>/external-auth, which 404s.
  matcher: [
    "/((?!api|ingest|_next|_vercel|external-auth|.*\\..*).*)",
    "/api/:path*",
  ],
};
