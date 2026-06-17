"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/pwa";

const SPLASH_DURATION_MS = 1000;

// useLayoutEffect runs before paint (so the splash covers content with no
// flash), but warns when server-rendered. Fall back to useEffect on the server.
const useBeforePaintEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function LaunchSplash() {
  const [bg, setBg] = useState("");
  const [visible, setVisible] = useState(false);

  useBeforePaintEffect(() => {
    if (isStandalonePwa()) return;

    // Read the fully-resolved background color from body rather than relying on
    // the 4-level CSS var chain (--color-background → --background → --bg-base →
    // --neutral-*), which iOS Chrome WebKit may not resolve before first paint.
    setBg(window.getComputedStyle(document.body).backgroundColor);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 text-[var(--foreground)]"
      style={{ backgroundColor: bg }}
    >
      <Image
        src="/icon-192x192.png"
        alt=""
        width={72}
        height={72}
        className="rounded-[18px]"
        priority
      />
      <span className="font-display text-[22px] font-bold tracking-[-0.3px]">
        RecipAI
      </span>
    </div>
  );
}
