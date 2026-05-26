"use client";

import { useEffect, useState } from "react";
import { THEME } from "@/lib/theme";
import { TogglePill } from "./toggle-pill";

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
    localStorage.setItem("theme", themeName);
    // biome-ignore lint/suspicious/noDocumentCookie: theme cookie set for server-side dark/light detection
    document.cookie = `theme=${themeName}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <TogglePill checked={isDark} />
    </button>
  );
}
