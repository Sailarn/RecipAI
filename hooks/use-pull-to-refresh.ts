"use client";

import { useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    function setHeight(height: number, animated = false) {
      const element = indicatorRef.current;
      if (!element) return;
      element.style.transition = animated ? "height 0.25s ease-out" : "none";
      element.style.height = `${height}px`;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY !== 0) return;
      startY.current = event.touches[0].clientY;
      isPulling.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!isPulling.current || isRefreshingRef.current) return;
      const delta = event.touches[0].clientY - startY.current;
      if (delta < 0) {
        isPulling.current = false;
        return;
      }
      const next = Math.min(delta * 0.4, threshold);
      pullDistanceRef.current = next;
      setHeight(next);
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistanceRef.current >= threshold) {
        setHeight(32);
        pullDistanceRef.current = 0;
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        await onRefreshRef.current();
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        setHeight(0, true);
      } else {
        pullDistanceRef.current = 0;
        setHeight(0, true);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold]);

  return { indicatorRef, isRefreshing };
}
