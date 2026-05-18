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
  shouldHide: boolean;
}

export function useBottomNav({
  staticActiveIndex,
  shouldHide,
}: UseBottomNavOptions) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [measure, setMeasure] = useState<Measure | null>(null);

  // Single source of truth for the pill's horizontal position.
  const leftMv = useMotionValue(0);

  // Gates pill rendering — pill only appears after the first measurement so it
  // never flashes at position 0.
  const [ready, setReady] = useState(false);

  // Tracks the running animation so we can stop it before seeding a new position.
  // Stopping prevents a stale animation (started while nav was hidden) from
  // overriding the freshly-seeded value on the next animation frame.
  const animCtrl = useRef<{ stop(): void } | null>(null);

  // Tracks shouldHide from the previous layout-effect call.
  // Mutating refs inside effects (not render) is safe in concurrent mode.
  const prevShouldHideRef = useRef(shouldHide);

  // True once the first measurement has completed.
  const measuredRef = useRef(false);

  // ─── Measure on mount and on hide→show ─────────────────────────────────────
  // Fires when shouldHide or staticActiveIndex changes. staticActiveIndex is
  // included so the closure always captures the current active tab when the
  // nav transitions from hidden→visible (both can change in the same render).
  // biome-ignore lint/correctness/useExhaustiveDependencies: leftMv and animCtrl are stable refs
  useLayoutEffect(() => {
    const wasHidden = prevShouldHideRef.current;
    prevShouldHideRef.current = shouldHide;

    if (shouldHide) return;
    // Already visible and already measured: tab switches handled by the spring effect.
    if (!wasHidden && measuredRef.current) return;

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

    // Stop any in-flight animation before snapping so it cannot override the
    // seeded value on the next frame (leftMv.set does not cancel animations).
    animCtrl.current?.stop();
    leftMv.set(pillLeft(staticActiveIndex, m));
    measuredRef.current = true;
    setMeasure(m);
    setReady(true);
  }, [shouldHide, staticActiveIndex]);

  // ─── Spring to active tab on route change ──────────────────────────────────
  // shouldHide guards against drifting leftMv while the nav is hidden —
  // when a route with no matching tab is active (e.g. /recipes/new) the
  // staticActiveIndex falls back to 0, which would otherwise start a spring
  // toward the wrong tab. Effect 1 already snaps on hide→show.
  // biome-ignore lint/correctness/useExhaustiveDependencies: leftMv and animCtrl are stable refs
  useLayoutEffect(() => {
    if (!measure) return;
    if (shouldHide) return;
    const target = pillLeft(staticActiveIndex, measure);
    animCtrl.current?.stop();
    animCtrl.current = animate(leftMv, target, SPRING);
  }, [staticActiveIndex, measure, shouldHide]);

  return {
    navRef,
    itemRefs,
    ready,
    leftMv,
    measure,
  };
}
