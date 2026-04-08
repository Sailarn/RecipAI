"use client";

import { useEffect } from "react";

// Keeps the <meta name="theme-color"> in sync with the dark/light class so
// iOS PWA status bar background matches the app background in both modes.
export function ThemeColorSync() {
  useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const color = isDark ? "#0a0a0a" : "#ffffff";
      // Replace all theme-color metas (there may be multiple from the viewport
      // media-query export) with a single authoritative one without a media attr.
      for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
        m.remove();
      }
      const fresh = document.createElement("meta");
      fresh.name = "theme-color";
      fresh.content = color;
      document.head.appendChild(fresh);
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
