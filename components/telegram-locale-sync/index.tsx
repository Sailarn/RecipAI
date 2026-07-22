"use client";

import { useEffect, useRef } from "react";
import { useTelegram } from "@/components/telegram-provider";
import { resolveLaunchLocale } from "@/lib/telegram/launch-locale";
import { getLaunchStartParam } from "@/lib/telegram/webapp";
import { useNavigate } from "@/lib/transitions";

/** Swaps the `/[locale]/…` segment of a path, preserving the rest. */
export function swapLocale(pathname: string, locale: string): string {
  const parts = pathname.split("/");
  parts[1] = locale;
  return parts.join("/") || `/${locale}`;
}

/**
 * Restores the Mini App locale on launch. The locale lives in the URL path, but
 * a WebView reopen lands on the default (localStorage/cookies are cleared), so
 * this resolves the intended locale — the user's stored choice, else a seed from
 * the Telegram UI language (`resolveLaunchLocale`) — and redirects if the launch
 * URL doesn't match.
 *
 * Waits for the SDK (`webApp`) since CloudStorage and `language_code` need it. A
 * deep link owns the launch destination and its own locale, so this defers to it
 * (skips when a `start_param` is present) to avoid competing navigations.
 */
export function TelegramLocaleSync() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !webApp) return;
    handled.current = true;
    if (getLaunchStartParam()) return;

    void resolveLaunchLocale(webApp).then((locale) => {
      const currentLocale = window.location.pathname.split("/")[1];
      if (locale !== currentLocale) {
        navigate.replace(swapLocale(window.location.pathname, locale));
      }
    });
  }, [webApp, navigate]);

  return null;
}
