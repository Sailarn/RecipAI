"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

interface UsePullToRefreshOptions {
  enabled: boolean;
  onRefresh: () => Promise<void>;
  scrollRef: RefObject<HTMLElement | null>;
  threshold?: number;
}

const PULL_RESISTANCE = 0.4;
const MINIMUM_REFRESH_FEEDBACK_MS = 350;

function waitForRefreshFeedback() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, MINIMUM_REFRESH_FEEDBACK_MS);
  });
}

export function usePullToRefresh({
  enabled,
  onRefresh,
  scrollRef,
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
    if (!enabled) return;
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    function setHeight(height: number, animated = false) {
      const element = indicatorRef.current;
      if (!element) return;
      element.style.transition = animated ? "height 0.25s ease-out" : "none";
      element.style.setProperty("--pull-height", `${height}px`);
    }

    const onTouchStart = (event: TouchEvent) => {
      if (scrollContainer.scrollTop > 0) return;
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
      const visualDistance = Math.min(delta * PULL_RESISTANCE, threshold);
      pullDistanceRef.current = delta;
      setHeight(visualDistance);
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistanceRef.current >= threshold) {
        setHeight(32);
        pullDistanceRef.current = 0;
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        try {
          await Promise.all([onRefreshRef.current(), waitForRefreshFeedback()]);
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setHeight(0, true);
        }
      } else {
        pullDistanceRef.current = 0;
        setHeight(0, true);
      }
    };

    scrollContainer.addEventListener("touchstart", onTouchStart, {
      passive: true,
    });
    scrollContainer.addEventListener("touchmove", onTouchMove, {
      passive: true,
    });
    scrollContainer.addEventListener("touchend", onTouchEnd);

    return () => {
      scrollContainer.removeEventListener("touchstart", onTouchStart);
      scrollContainer.removeEventListener("touchmove", onTouchMove);
      scrollContainer.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, scrollRef, threshold]);

  return { indicatorRef, isRefreshing };
}
