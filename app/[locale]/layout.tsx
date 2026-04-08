import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ClientShell } from "@/components/client-shell";
import { ThemeColorSync } from "@/components/theme-color-sync";
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
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" />
        {/* Apply theme class synchronously before first paint to prevent FOUC.
            Without this, ThemeProvider's useEffect runs after paint, causing a
            white flash on the body/html background (visible in iOS status bar area). */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional anti-FOUC inline script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(t);}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeColorSync />
          <ClientShell>{children}</ClientShell>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
