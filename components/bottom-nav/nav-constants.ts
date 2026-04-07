// ─── Nav sizing ───────────────────────────────────────────────────────────────
//
// To change the number of nav items:
//   1. Set PILL_W = floor(NAV_W / itemCount) - 2
//        2 items in 200 px → floor(200/2) - 2 = 98 → use 96 for a touch of breathing room
//        3 items in 280 px → floor(280/3) - 2 = 91 → use 88–90
//   2. Update the w-[Xpx] Tailwind class on the wrapper div in index.tsx to match.
//      Rule of thumb: NAV_W ≈ (PILL_W + 4) × itemCount
//
// ─────────────────────────────────────────────────────────────────────────────
export const PILL_W = 96; // pill width at rest
export const PILL_H = 45; // pill height at rest
export const DRAG_EXPAND = 8; // px the pill grows on each side while dragging

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
 * Edge items are anchored to the nav's inner border so both sides have equal gaps.
 * Middle items (3+ nav items) are centered on their slot.
 */
export function pillLeft(index: number, m: Measure): number {
  const n = m.itemLefts.length;
  if (index === 0) return m.itemLefts[0]; // flush with inner left edge
  if (index === n - 1) return m.itemLefts[n - 1] + m.itemWidths[n - 1] - PILL_W; // flush with inner right edge
  const center = m.itemLefts[index] + m.itemWidths[index] / 2;
  return center - PILL_W / 2;
}
