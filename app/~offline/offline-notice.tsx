"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultLocale, type Locale, locales } from "@/i18n/config";

// This page is prerendered outside the [locale] tree and served by the service
// worker for *any* failed navigation, so it can't use next-intl. The strings
// live here instead — there are three of them, and duplicating them beats
// shipping an English-only dead end to a Ukrainian user.
const COPY: Record<Locale, { title: string; body: string; retry: string }> = {
  en: {
    title: "You're offline",
    body: "Your saved recipes are still on this device — reconnect to load this page.",
    retry: "Try again",
  },
  ua: {
    title: "Немає з'єднання",
    body: "Збережені рецепти залишаються на цьому пристрої — підключіться, щоб завантажити цю сторінку.",
    retry: "Спробувати ще раз",
  },
};

function storedLocale(): Locale {
  const match = /NEXT_LOCALE=([^;]+)/.exec(document.cookie);
  const cookieLocale = match?.[1];
  return locales.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : defaultLocale;
}

export function OfflineNotice() {
  // Rendered with the default locale during prerender, corrected on mount —
  // the cookie only exists in the browser.
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    setLocale(storedLocale());
  }, []);

  const copy = COPY[locale];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg-base)] px-6 text-center">
      <WifiOff
        aria-hidden
        className="size-10 text-[var(--fg-3)]"
        strokeWidth={1.5}
      />
      <h1 className="font-heading text-xl font-extrabold text-[var(--fg-1)]">
        {copy.title}
      </h1>
      <p className="max-w-xs text-sm text-[var(--fg-2)]">{copy.body}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {copy.retry}
      </Button>
    </div>
  );
}
