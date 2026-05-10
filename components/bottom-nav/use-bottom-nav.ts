import { animate, useMotionValue } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

// ─── Nav sizing ───────────────────────────────────────────────────────────────
export const PILL_W = 74; // pill width at rest
export const PILL_H = 45; // pill height at rest

export const SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 38,
  mass: 0.7,
};

export type Measure = {
  itemWidths: number[];
  itemLefts: number[];
  innerHeight: number;
};

/**
 * Returns the pill's `left` position (nav-relative) for the given item index.
 * The pill is always centered on the item's slot.
 */
export function pillLeft(index: number, m: Measure): number {
  const center = m.itemLefts[index] + m.itemWidths[index] / 2;
  return center - PILL_W / 2;
}

interface UseBottomNavOptions {
  staticActiveIndex: number;
  /** Incremented on each hide→show transition to force re-measurement. */
  measureKey?: number;
}

export function useBottomNav({
  staticActiveIndex,
  measureKey,
}: UseBottomNavOptions) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [measure, setMeasure] = useState<Measure | null>(null);

  // Single source of truth for the pill's horizontal position.
  const leftMv = useMotionValue(0);

  // Gates pill rendering — pill only appears after the first measurement so it
  // never flashes at position 0.
  const [ready, setReady] = useState(false);

  // ─── Initial measurement ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: leftMv is a stable MotionValue ref
  useLayoutEffect(() => {
    if (!navRef.current) return;
    const navRect = navRef.current.getBoundingClientRect();
    const itemWidths: number[] = [];
    const itemLefts: number[] = [];
    itemRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      itemWidths.push(r.width);
      itemLefts.push(r.left - navRect.left);
    });
    const m: Measure = { itemWidths, itemLefts, innerHeight: navRect.height };
    // Seed position BEFORE setReady so the pill never renders at the wrong spot.
    leftMv.set(pillLeft(staticActiveIndex, m));
    setMeasure(m);
    setReady(true);
  }, [measureKey]);

  // ─── Route-change spring ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: leftMv is a stable MotionValue ref
  useLayoutEffect(() => {
    if (!measure) return;
    const target = pillLeft(staticActiveIndex, measure);
    animate(leftMv, target, SPRING);
  }, [staticActiveIndex, measure]);

  return {
    navRef,
    itemRefs,
    ready,
    leftMv,
    measure,
  };
}
