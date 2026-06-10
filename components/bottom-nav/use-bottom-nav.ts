import { animate, useMotionValue } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";

export const PILL_W = 74;
export const PILL_H = 45;

// Nav layout constants — exported so index.tsx can reuse them for styling.
export const MAIN_NAV_W = 260;
const NAV_H = 56;
const ITEM_COUNT = 3; // Recipes · AI Import · Profile

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

// Items use flex:1 across MAIN_NAV_W, so positions are fully deterministic.
// No DOM measurement is needed or attempted — this eliminates the timing bug
// where getBoundingClientRect() read mid-CSS-transition (80→260px on pantry
// return) and stored permanently wrong positions.
// The items live in the nav's padding box (MAIN_NAV_W minus the 1px glass
// border each side), so the pill must map into that inner width — otherwise it
// drifts right and the end items sit unevenly from the edges.
const ITEM_W = (MAIN_NAV_W - 2) / ITEM_COUNT;

const STATIC_MEASURE: Measure = {
  itemWidths: Array<number>(ITEM_COUNT).fill(ITEM_W),
  itemLefts: Array.from({ length: ITEM_COUNT }, (_, i) => ITEM_W * i),
  innerHeight: NAV_H,
};

/**
 * Returns the pill's `left` position (nav-relative) for the given item index.
 * Computed analytically from layout constants — never reads the DOM.
 */
export function pillLeft(index: number): number {
  const center = ITEM_W * index + ITEM_W / 2;
  return center - PILL_W / 2;
}

interface UseBottomNavOptions {
  staticActiveIndex: number;
  shouldHide: boolean;
}

export function useBottomNav({
  staticActiveIndex,
  shouldHide,
}: UseBottomNavOptions) {
  // Initialize to the correct position so NavPill never starts at 0.
  const leftMv = useMotionValue(pillLeft(staticActiveIndex));
  const [ready, setReady] = useState(false);
  const animCtrl = useRef<{ stop(): void } | null>(null);

  // Snap to the correct slot on mount, then mark ready so NavPill renders.
  // Runs once — the spring effect below handles all subsequent movement.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount
  useLayoutEffect(() => {
    animCtrl.current?.stop();
    leftMv.set(pillLeft(staticActiveIndex));
    setReady(true);
  }, []);

  // Spring to the active slot whenever the tab changes or the nav re-appears.
  // shouldHide guards against drifting while the nav is invisible — when a
  // route with no matching tab is active (e.g. /pantry) staticActiveIndex
  // falls back to 0; the guard prevents a stray spring toward the wrong tab.
  // biome-ignore lint/correctness/useExhaustiveDependencies: leftMv and animCtrl are stable refs
  useLayoutEffect(() => {
    if (shouldHide) return;
    const target = pillLeft(staticActiveIndex);
    animCtrl.current?.stop();
    animCtrl.current = animate(leftMv, target, SPRING);
  }, [staticActiveIndex, shouldHide]);

  return { ready, leftMv, measure: STATIC_MEASURE };
}
