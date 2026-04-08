"use client";

import { useEffect } from "react";

// Keeps the <meta name="theme-color"> in sync with the dark/light class so
// iOS PWA status bar background matches the app background in both modes.
export function ThemeColorSync() {
  useEffect(() => {
    const update = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const color = isDark ? "#0a0a0a" : "#ffffff";
      // Only update .content — never remove/recreate the meta element.
      // Next.js owns the element (from the viewport export); removing it
      // causes a removeChild error when Next.js tries to reconcile on navigation.
      const meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );
      if (meta) meta.content = color;
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
