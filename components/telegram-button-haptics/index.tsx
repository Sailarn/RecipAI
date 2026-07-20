"use client";

import { useEffect } from "react";
import { usePlatform } from "@/lib/platform";

/**
 * Fires a light native haptic on every button press inside Telegram — one
 * delegated listener instead of per-component code, so any button (including
 * the bottom-nav pantry pill) gets tactile feedback for free. Renders nothing;
 * no-op outside Telegram. Stronger, semantic haptics (save success, delete
 * warning) stay at their specific handlers.
 */
export function TelegramButtonHaptics() {
  const platform = usePlatform();

  useEffect(() => {
    if (platform.kind !== "telegram") return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest?.("button, [role='button']");
      if (!button) return;
      if (
        button.matches(":disabled") ||
        button.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }
      platform.haptics.impact("light");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [platform]);

  return null;
}
