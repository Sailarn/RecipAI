"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/pwa";
import { isTelegramEnvironment } from "@/lib/telegram/webapp";

// Kept visible at least this long so an instant load doesn't flash the logo.
const MIN_VISIBLE_MS = 250;
// Ceiling, in case the readiness signal never arrives (rAF starved, tab hidden
// at launch). The splash must never outlive this.
const MAX_VISIBLE_MS = 1000;

// Show only after mount. Rendering the splash during SSR makes it a server-only
// node next to the client-only page stack, which React can't reconcile during
// hydration (structural mismatch). Mounting it client-side via a before-paint
// effect keeps it out of the SSR HTML — and the inline dark <style> in the
// layout head still paints the first frame, so there is no flash. useLayoutEffect
// runs before the browser paints; fall back to useEffect on the server.
const useBeforePaintEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function LaunchSplash() {
  const [visible, setVisible] = useState(false);

  useBeforePaintEffect(() => {
    // The installed PWA already shows its splash via public/pwa-launch.html;
    // Telegram shows its own launch UI until webApp.ready() fires.
    if (isStandalonePwa() || isTelegramEnvironment()) return;

    setVisible(true);
    const shownAt = Date.now();

    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      setVisible(false);
    };

    // Hide on readiness rather than on a fixed timer: this effect runs in the
    // hydration commit, so two animation frames later the browser has painted
    // the frame containing the real app and the splash has nothing left to
    // cover. A fast launch used to sit here for the remainder of a full second.
    let floorTimer: ReturnType<typeof setTimeout> | undefined;
    let paintedFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      paintedFrame = requestAnimationFrame(() => {
        floorTimer = setTimeout(
          hide,
          Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt)),
        );
      });
    });
    const ceilingTimer = setTimeout(hide, MAX_VISIBLE_MS);

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(paintedFrame);
      clearTimeout(floorTimer);
      clearTimeout(ceilingTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      data-launch-splash
      aria-hidden
      className="launch-splash fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-[#0a0a0a] text-white"
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
