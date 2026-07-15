import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ClientShell } from "@/components/client-shell";
import { LaunchSplash } from "@/components/launch-splash";
import { StatusBarScrim } from "@/components/status-bar-scrim";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { type Locale, locales } from "@/i18n/request";
import { THEME } from "@/lib/theme";
import "../globals.css";

// Pre-paint theme sync: the html/body class + background below are always the
// static THEME.DARK default (no per-request cookie read, so this layout can be
// statically rendered — see docs/reference/gotchas.md "Locale layout is
// statically rendered"). If the user previously chose light (ThemeToggle
// mirrors it to localStorage alongside the cookie), this script flips the
// class before first paint. Synchronous, no src/async/module, so it runs and
// completes before the browser paints — same no-flash technique as
// next-themes. suppressHydrationWarning on <html>/<body> below anticipates
// the class this script may change.
const THEME_SYNC_SCRIPT = `(function(){try{if(localStorage.getItem("theme")==="light"){var el=document.documentElement;el.classList.remove("dark");el.classList.add("light");}}catch(e){}})();`;

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  // 300 omitted — Fraunces is never rendered below 400 (headings use 400-800),
  // so loading the light weight was dead cold-start payload. Inter
  // (--font-sans) is a variable font, so light sans text is unaffected.
  weight: ["400", "500", "600", "700", "800"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Must run before getMessages() — tells next-intl which locale to render
  // statically for, instead of falling back to per-request header detection
  // (which would make this layout dynamic again).
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${THEME.DARK}`}
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static compile-time constant, no user input, needed for the synchronous pre-paint theme script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SYNC_SCRIPT }} />
        <style>{`
          html, body { background: #0a0a0a; }
          html.light, html.light body { background: #ffffff; }
          .launch-splash {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: #0a0a0a;
            color: #fff;
          }
          .launch-splash img {
            width: 72px;
            height: 72px;
            border-radius: 18px;
          }
          .launch-splash span {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.3px;
          }
          @media (display-mode: standalone) {
            .launch-splash { display: none !important; }
          }
        `}</style>
        <link rel="preconnect" href="https://ik.imagekit.io" />
      </head>
      <body suppressHydrationWarning>
        <StatusBarScrim />
        <NextIntlClientProvider messages={messages}>
          <LaunchSplash />
          <ThemeColorSync />
          <ClientShell>{children}</ClientShell>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
