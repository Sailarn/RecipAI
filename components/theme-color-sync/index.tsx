"use client";

import { useEffect } from "react";
import { THEME } from "@/lib/theme";

// Sets theme-color meta to match the current theme on every page load.
// The anti-FOUC script already applied the correct class before first paint,
// so this just makes the iOS status bar match. No observer needed — theme
// changes trigger window.location.reload() which re-runs this on the new load.
export function ThemeColorSync() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) return;
    const isDark = document.documentElement.classList.contains(THEME.DARK);
    meta.setAttribute("content", isDark ? "#0a0a0a" : "#ffffff");
  }, []);

  return null;
}
