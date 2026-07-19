"use client";

import { useEffect, useRef } from "react";
import { useTelegram } from "@/components/telegram-provider";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

const RECIPE_PREFIX = "recipe_";

/**
 * Maps a Telegram `start_param` (from a `t.me/<bot>/<app>?startapp=…` link) to
 * an in-app route. Returns null for an empty or unrecognized value.
 *
 * Supported: `pantry`, `parse`, `profile`, and `recipe_<id>`.
 */
export function resolveStartParamHref(
  startParam: string | undefined,
  locale: string,
): string | null {
  if (!startParam) return null;
  if (startParam === "pantry") return routes.pantry(locale);
  if (startParam === "parse") return routes.recipes.parse(locale);
  if (startParam === "profile") return routes.profile(locale);
  if (startParam.startsWith(RECIPE_PREFIX)) {
    const id = startParam.slice(RECIPE_PREFIX.length);
    return id ? routes.recipes.detail(locale, id) : null;
  }
  return null;
}

function currentLocale(): string {
  return window.location.pathname.split("/")[1] || "en";
}

/**
 * Navigates to the target of the Mini App's launch `start_param`, once. Renders
 * nothing. No-op outside Telegram or when the param is absent/unrecognized.
 */
export function TelegramDeepLink() {
  const { webApp } = useTelegram();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (!webApp || handled.current) return;
    handled.current = true;
    const href = resolveStartParamHref(
      webApp.initDataUnsafe.start_param,
      currentLocale(),
    );
    if (href) navigate.push(href);
  }, [webApp, navigate]);

  return null;
}
