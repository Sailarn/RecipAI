"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { TogglePill } from "@/components/toggle-pill";
import { isStandalonePwa } from "@/lib/pwa";
import { CLOUD_PREF_KEYS, setCloudItem } from "@/lib/telegram/cloud-storage";
import { isTelegramEnvironment } from "@/lib/telegram/webapp";
import { trackEvent } from "@/lib/telemetry";
import { THEME } from "@/lib/theme";

const COOKIE_MAX_AGE_SECONDS = 31_536_000; // 1 year

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains(THEME.DARK));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const themeName = next ? THEME.DARK : THEME.LIGHT;
    trackEvent("theme_changed", { theme: themeName });
    localStorage.setItem("theme", themeName);
    // biome-ignore lint/suspicious/noDocumentCookie: theme cookie set for server-side dark/light detection
    document.cookie = `theme=${themeName}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    // Telegram clears localStorage/cookies between sessions, so mirror the choice
    // to CloudStorage — the launch restore reads it back on the next reopen.
    // No-op outside Telegram.
    void setCloudItem(CLOUD_PREF_KEYS.theme, themeName);
    // Telegram shows no launch splash, so a reload is pointless — and it would
    // drop the Telegram launch context. Apply the theme class in place instead.
    if (isTelegramEnvironment()) {
      const root = document.documentElement;
      root.classList.toggle(THEME.DARK, next);
      root.classList.toggle(THEME.LIGHT, !next);
      return;
    }
    // Reload to re-trigger the splash. In the PWA that means routing through the
    // static shell page; in the browser a plain reload lets <LaunchSplash> fire.
    if (isStandalonePwa()) {
      window.location.replace(
        `/pwa-launch.html?from=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
    } else {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="bg-transparent border-0 p-0 shrink-0 cursor-pointer"
    >
      <TogglePill checked={isDark} offIcon={Sun} onIcon={Moon} />
    </button>
  );
}
