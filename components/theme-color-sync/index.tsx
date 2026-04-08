"use client";

import { useEffect, useRef } from "react";

// Keeps the iOS PWA status bar color in sync with the current theme.
//
// Strategy: we create and fully own a <meta name="theme-color"> element
// (distinct from the one Next.js generates via the viewport export).
// We insert it as the first child of <head> so it takes precedence.
// On theme change we remove and re-insert our own element — this is the
// only reliable way to force iOS to repaint the status bar live, and it
// is safe because React does not own this element.
export function ThemeColorSync() {
  const ownMetaRef = useRef<HTMLMetaElement | null>(null);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.insertBefore(meta, document.head.firstChild);
    ownMetaRef.current = meta;

    const update = () => {
      const m = ownMetaRef.current;
      if (!m) return;
      const isDark = document.documentElement.classList.contains("dark");
      m.content = isDark ? "#0a0a0a" : "#ffffff";
      // Remove and re-insert our own element — forces iOS to re-read the
      // theme color and repaint the status bar while the app is in foreground.
      m.remove();
      document.head.insertBefore(m, document.head.firstChild);
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      ownMetaRef.current?.remove();
      ownMetaRef.current = null;
    };
  }, []);

  return null;
}
