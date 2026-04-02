import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ViewTransitions } from "next-view-transitions";
import { ClientShell } from "@/components/client-shell";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { locales } from "@/i18n/request";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as "ua" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <ViewTransitions>
      <html lang={locale} suppressHydrationWarning className={inter.variable}>
        <head>
          <link rel="preconnect" href="https://ik.imagekit.io" />
        </head>
        <body suppressHydrationWarning>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              <ClientShell>{children}</ClientShell>
            </ThemeProvider>
          </NextIntlClientProvider>
          <SpeedInsights />
        </body>
      </html>
    </ViewTransitions>
  );
}
