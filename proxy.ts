import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { ensureAppAvailable } from "@/lib/maintenance";
import { routes } from "@/lib/routes";
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

const LOCALE_ROOT_PATTERN = new RegExp(`^/(${locales.join("|")})/?$`);

/**
 * The locale root (`/ua`) only ever redirects on to the recipes list, so
 * landing there costs an extra server round-trip. Cold launches used to pay it
 * twice: `/` → `/ua` (next-intl) → `/ua/recipes` (the page's own redirect).
 *
 * Extending the destination here collapses both hops into one. next-intl still
 * owns locale negotiation — we only lengthen the path it chose.
 */
function recipesListFor(localeRootPath: string): string {
  const locale = localeRootPath.replace(/^\/|\/$/g, "");
  return routes.recipes.list(locale);
}

function skipLocaleRoot(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const redirectTarget = response.headers.get("location");

  if (redirectTarget) {
    const target = new URL(redirectTarget, request.nextUrl.origin);
    if (!LOCALE_ROOT_PATTERN.test(target.pathname)) return response;
    target.pathname = recipesListFor(target.pathname);
    // Mutating the header keeps next-intl's status and its NEXT_LOCALE cookie.
    response.headers.set("location", target.toString());
    return response;
  }

  if (!LOCALE_ROOT_PATTERN.test(request.nextUrl.pathname)) return response;
  const target = request.nextUrl.clone();
  target.pathname = recipesListFor(request.nextUrl.pathname);
  return NextResponse.redirect(target);
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) {
    if (isExemptApiPath(pathname)) return NextResponse.next();

    const maintenance = await ensureAppAvailable();
    return maintenance ?? NextResponse.next();
  }

  return skipLocaleRoot(intlMiddleware(req), req);
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
