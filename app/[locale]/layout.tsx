import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Fraunces, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ClientShell } from "@/components/client-shell";
import { LaunchSplash } from "@/components/launch-splash";
import { StatusBarScrim } from "@/components/status-bar-scrim";
import { ThemeColorSync } from "@/components/theme-color-sync";
import { type Locale, locales } from "@/i18n/request";
import { THEME } from "@/lib/theme";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

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

  const messages = await getMessages();

  const cookieStore = await cookies();
  const theme =
    cookieStore.get("theme")?.value === THEME.LIGHT ? THEME.LIGHT : THEME.DARK;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${theme}`}
    >
      <head>
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
