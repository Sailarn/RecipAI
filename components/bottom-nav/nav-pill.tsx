"use client";

import type { MotionValue } from "motion/react";
import { motion } from "motion/react";
import { DRAG_EXPAND, PILL_H, PILL_W } from "./nav-constants";

interface NavPillProps {
  leftMv: MotionValue<number>;
  isDragging: boolean;
  yNormal: number; // vertical offset that centers the pill within the nav
  yDrag: number; // vertical offset while dragging (pulls pill up to expand evenly)
}

export function NavPill({ leftMv, isDragging, yNormal, yDrag }: NavPillProps) {
  return (
    <motion.div
      // y=0 at mount because top=yNormal already positions the pill correctly;
      // y only animates away from 0 when dragging expands the pill upward.
      initial={{ y: 0, borderRadius: 18 }}
      animate={{
        width: isDragging ? PILL_W + DRAG_EXPAND * 2 : PILL_W,
        height: isDragging ? PILL_H + DRAG_EXPAND * 2 : PILL_H,
        y: isDragging ? yDrag - yNormal : 0,
        borderRadius: isDragging ? 22 : 18,
      }}
      transition={{
        width: { type: "spring", stiffness: 400, damping: 28 },
        height: { type: "spring", stiffness: 400, damping: 28 },
        y: { type: "spring", stiffness: 400, damping: 28 },
        borderRadius: { duration: 0.15 },
      }}
      style={{
        position: "absolute",
        top: yNormal, // CSS top centers the pill; never animates, so no flash on mount
        left: leftMv, // MotionValue — horizontal updates bypass React entirely
        pointerEvents: "none",
        zIndex: isDragging ? 3 : 0,
      }}
      className={isDragging ? "nav-pill nav-pill-dragging" : "nav-pill"}
    />
  );
}
