"use client";

import { useEffect } from "react";

// Keeps the <meta name="theme-color"> in sync with the dark/light class so
// iOS PWA status bar background matches the app background in both modes.
export function ThemeColorSync() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) return;

    const update = () => {
      const isDark = document.documentElement.classList.contains("dark");
      meta.content = isDark ? "#0a0a0a" : "#ffffff";
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
