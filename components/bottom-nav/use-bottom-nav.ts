import { animate, useMotionValue } from "motion/react";
import type { PointerEvent } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import {
  DRAG_EXPAND,
  type Measure,
  PILL_W,
  pillLeft,
  SPRING,
} from "./nav-constants";

interface UseBottomNavOptions {
  staticActiveIndex: number;
  /** Called with the snapped-to index when the user releases a drag. */
  onNavigate: (index: number) => void;
}

export function useBottomNav({
  staticActiveIndex,
  onNavigate,
}: UseBottomNavOptions) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [measure, setMeasure] = useState<Measure | null>(null);

  // Single source of truth for the pill's horizontal position.
  // Set directly during drag (no React re-renders) and spring-animated on snap.
  const leftMv = useMotionValue(0);

  // Gates pill rendering — pill only appears after the first measurement so it
  // never flashes at position 0.
  const [ready, setReady] = useState(false);

  // ─── Initial measurement ───────────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount to seed initial position
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
  }, []);

  // ─── Route-change spring ───────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isDragging and leftMv intentionally omitted — isDragging would retrigger the spring on drag end, leftMv is a stable MotionValue ref
  useLayoutEffect(() => {
    if (!measure || isDragging) return;
    animate(leftMv, pillLeft(staticActiveIndex, measure), SPRING);
  }, [staticActiveIndex, measure]);

  // ─── Drag ──────────────────────────────────────────────────────────────────
  const [pendingIndex, setPendingIndex] = useState(staticActiveIndex);
  const dragRef = useRef({ startX: 0, moved: false, isDown: false });

  function findNearest(clientX: number): number {
    if (!navRef.current || !measure) return staticActiveIndex;
    const rect = navRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    let cumulative = 0;
    for (let i = 0; i < measure.itemWidths.length; i++) {
      cumulative += measure.itemWidths[i];
      if (relX <= cumulative) return i;
    }
    return measure.itemWidths.length - 1;
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    dragRef.current = { startX: e.clientX, moved: false, isDown: true };
    // Do NOT call setPointerCapture here — capturing on every pointerdown
    // redirects the subsequent click event to <nav>, killing NavItem onClick.
    // Capture is set only once drag is confirmed (8px movement threshold).
  }

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (!dragRef.current.isDown) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    if (!dragRef.current.moved && dx > 8) {
      dragRef.current.moved = true;
      // Capture pointer now that we're sure it's a drag, not a tap.
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      setPendingIndex(staticActiveIndex);
    }
    if (dragRef.current.moved && measure && navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      const dragW = PILL_W + DRAG_EXPAND * 2;
      const relX = e.clientX - rect.left;
      // Clamp so the expanded pill stays within nav bounds
      const center = Math.max(
        dragW / 2,
        Math.min(rect.width - dragW / 2, relX),
      );
      // Direct set — instant finger-following, bypasses React
      leftMv.set(center - dragW / 2 - DRAG_EXPAND);
      const nearest = findNearest(e.clientX);
      if (nearest !== pendingIndex) setPendingIndex(nearest);
    }
  }

  function onPointerUp(e: PointerEvent<HTMLElement>) {
    if (dragRef.current.moved && measure) {
      const nearest = findNearest(e.clientX);
      animate(leftMv, pillLeft(nearest, measure), SPRING);
      setPendingIndex(nearest);
      setIsDragging(false);
      onNavigate(nearest);
    }
    dragRef.current.moved = false;
    dragRef.current.isDown = false;
  }

  return {
    navRef,
    itemRefs,
    ready,
    leftMv,
    measure,
    isDragging,
    pendingIndex,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
