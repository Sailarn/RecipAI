"use client";

import { useEffect, useRef } from "react";
import { RecipeDetail } from "@/components/recipe-detail";
import { routes } from "@/lib/routes";
import {
  getLaunchStartParam,
  isTelegramEnvironment,
} from "@/lib/telegram/webapp";
import { useNavigate } from "@/lib/transitions";

const RECIPE_PREFIX = "recipe_";

/** The recipe id in a `recipe_<id>` start param, or null for anything else. */
export function recipeIdFromStartParam(
  startParam: string | undefined,
): string | null {
  if (!startParam || !startParam.startsWith(RECIPE_PREFIX)) return null;
  return startParam.slice(RECIPE_PREFIX.length) || null;
}

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
  const recipeId = recipeIdFromStartParam(startParam);
  if (recipeId) return routes.recipes.detail(locale, recipeId);
  return null;
}

function currentLocale(): string {
  return window.location.pathname.split("/")[1] || "en";
}

/**
 * Navigates to the target of the Mini App's launch `start_param`, once. Renders
 * nothing. No-op outside Telegram or when the param is absent/unrecognized.
 *
 * Reads the param synchronously from the launch hash rather than waiting for the
 * SDK's `webApp` object, so it acts before the first paint. A `recipe_<id>` is
 * **pushed onto the navigation stack** over the recipes list (the launch page,
 * since the home route redirects there) — so closing it pops back to the list
 * with the stack's slide animation, instead of a bare URL replace that leaves
 * nothing underneath and loses the transition. Non-recipe destinations are tab
 * roots, so they `replace`.
 */
export function TelegramDeepLink() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !isTelegramEnvironment()) return;
    handled.current = true;

    const startParam = getLaunchStartParam();
    const locale = currentLocale();
    const recipeId = recipeIdFromStartParam(startParam);

    if (recipeId) {
      navigate.push(
        routes.recipes.detail(locale, recipeId),
        <RecipeDetail recipeId={recipeId} locale={locale} />,
      );
      return;
    }

    const href = resolveStartParamHref(startParam, locale);
    if (href) navigate.replace(href);
  }, [navigate]);

  return null;
}
