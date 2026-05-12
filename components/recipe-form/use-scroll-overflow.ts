"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollOverflow(activeTab: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeTab triggers recheck when form tab changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      const form = el.firstElementChild as HTMLElement | null;
      if (!form) return;
      // scrollHeight is inflated by unknown overflow — use rendered height instead
      const contentH = form.getBoundingClientRect().height;
      const availableH = el.clientHeight - 32; // minus 16px top + 16px bottom padding
      setNeedsScroll(contentH > availableH + 1);
    };

    check();

    const ro = new ResizeObserver(check);
    ro.observe(el);
    const inner = el.firstElementChild;
    if (inner) ro.observe(inner);

    return () => ro.disconnect();
  }, [activeTab]);

  // When content fits, swallow touchmove so the gesture can't bubble up
  // to PageStack (which has overflowY: auto and would otherwise rubber-band
  // the whole form, including the bottom action bar).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || needsScroll) return;

    const swallow = (e: TouchEvent) => {
      e.preventDefault();
    };

    el.addEventListener("touchmove", swallow, { passive: false });
    return () => el.removeEventListener("touchmove", swallow);
  }, [needsScroll]);

  return { scrollRef, needsScroll };
}
