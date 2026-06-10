"use client";

import { NavColumn } from "./nav-column";
import { PantryIcon } from "./nav-icons";
import { PILL_H, PILL_W } from "./use-bottom-nav";

// Width of the compact single-item pantry pill (both modes). Sized so the inner
// pill clears the same ~4.5px margin on all four sides.
export const PANTRY_ITEM_W = 85;

// Centre the inner pill in the padding box (capsule size minus the 1px glass
// border each side) so its margin is even top/bottom and left/right.
const STATIC_PILL_TOP = (56 - 2 - PILL_H) / 2;

interface PantryPillProps {
  isPantryMode: boolean;
  label: string;
  onOpen: () => void;
}

export function PantryPill({ isPantryMode, label, onOpen }: PantryPillProps) {
  if (isPantryMode) {
    return (
      <div
        className="glass-nav select-none touch-none flex items-center justify-center relative overflow-hidden shrink-0 rounded-[28px] h-14"
        style={{ width: PANTRY_ITEM_W, minWidth: PANTRY_ITEM_W }}
      >
        {/* Static pill indicator — same glass style as the main nav pill */}
        <div
          className="nav-pill absolute rounded-[28px] pointer-events-none z-0"
          style={{
            left: (PANTRY_ITEM_W - 2 - PILL_W) / 2,
            top: STATIC_PILL_TOP,
            width: PILL_W,
            height: PILL_H,
          }}
        />
        <div
          data-testid="pantry-label"
          className="animate-[pillContentIn_0.26s_ease_0.18s_forwards] opacity-0 w-full h-full flex flex-col items-center justify-center gap-0.5 relative z-[4] text-[var(--food-accent)]"
        >
          <NavColumn icon={<PantryIcon />} label={label} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-nav select-none touch-none flex items-center justify-center relative overflow-hidden shrink-0 rounded-[28px] h-14"
      style={{ width: PANTRY_ITEM_W, minWidth: PANTRY_ITEM_W }}
    >
      <button
        type="button"
        data-testid="pantry-orb"
        onClick={onOpen}
        aria-label="Open Pantry"
        className="w-full h-full flex flex-col items-center justify-center gap-0.5 bg-transparent border-none cursor-pointer p-0 select-none text-[var(--fg-2)]"
      >
        <NavColumn icon={<PantryIcon />} label={label} />
      </button>
    </div>
  );
}
