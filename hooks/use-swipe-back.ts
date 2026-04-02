"use client";

import { useEffect } from "react";
import { nav } from "@/lib/transitions";

export function useSwipeBack() {
  useEffect(() => {
    let startX = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const diff = endX - startX;
      // swipe from left edge = back gesture
      if (startX < 30 && diff > 50) {
        nav.direction = "back";
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}
