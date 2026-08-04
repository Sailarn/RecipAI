"use client";

import { type RefObject, useEffect, useLayoutEffect, useState } from "react";

/**
 * True once `sentinelRef` has scrolled up past the top of `scrollRef` — the
 * signal for swapping a page header for its compact/sticky variant.
 *
 * Measures with `getBoundingClientRect`, never `scrollHeight`: the latter is
 * inflated under `overflow: hidden` (see docs/reference/gotchas.md).
 */
export function useScrollCollapse(
  scrollRef: RefObject<HTMLDivElement | null>,
  sentinelRef: RefObject<HTMLDivElement | null>,
  enabled: boolean,
): boolean {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Before paint, so a restored scroll position doesn't flash the tall header
  // for a frame before collapsing.
  useLayoutEffect(() => {
    if (!enabled) return;
    const container = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;
    setIsCollapsed(
      sentinel.getBoundingClientRect().top <
        container.getBoundingClientRect().top,
    );
  }, [enabled, scrollRef, sentinelRef]);

  useEffect(() => {
    if (!enabled) return;
    const container = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;

    const check = () =>
      setIsCollapsed(
        sentinel.getBoundingClientRect().top <
          container.getBoundingClientRect().top,
      );

    container.addEventListener("scroll", check, { passive: true });
    return () => container.removeEventListener("scroll", check);
  }, [enabled, scrollRef, sentinelRef]);

  return isCollapsed;
}
