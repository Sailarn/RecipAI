"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isStandalonePwa } from "@/lib/pwa";

const SPLASH_DURATION_MS = 1000;

export function LaunchSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isStandalonePwa()) {
      setVisible(false);
      return;
    }

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
