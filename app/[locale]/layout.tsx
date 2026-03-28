import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ViewTransitions } from "next-view-transitions";
import { BottomNav } from "@/components/bottom-nav/index";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { locales } from "@/i18n/request";
import "../globals.css";

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
      <html lang={locale} suppressHydrationWarning>
        <body suppressHydrationWarning>
          <NextIntlClientProvider messages={messages}>
            <ThemeProvider>
              <div className="min-h-screen flex flex-col">
                <main className="flex-1 mx-auto max-w-7xl pb-24 w-full">
                  {children}
                </main>
                <BottomNav />
              </div>
            </ThemeProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ViewTransitions>
  );
}
