"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/pwa";

const SPLASH_DURATION_MS = 1000;

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
    // The installed PWA already shows its splash via public/pwa-launch.html.
    if (isStandalonePwa()) return;

    setVisible(true);
    const timer = setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
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
