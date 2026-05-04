"use client";

import type { MotionValue } from "motion/react";
import { motion } from "motion/react";
import { PILL_H, PILL_W } from "./use-bottom-nav";

interface NavPillProps {
  leftMv: MotionValue<number>;
  yNormal: number; // vertical offset that centers the pill within the nav
  hidden?: boolean; // when true, pill is invisible but stays mounted to track position
}

export function NavPill({ leftMv, yNormal, hidden }: NavPillProps) {
  return (
    <motion.div
      initial={{ borderRadius: 28 }}
      animate={{
        width: PILL_W,
        height: PILL_H,
        borderRadius: 28,
        opacity: hidden ? 0 : 1,
        scale: hidden ? 0.8 : 1,
      }}
      transition={{
        width: { type: "spring", stiffness: 400, damping: 28 },
        height: { type: "spring", stiffness: 400, damping: 28 },
        borderRadius: { duration: 0.15 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      }}
      style={{
        position: "absolute",
        top: yNormal,
        left: leftMv,
        pointerEvents: "none",
        zIndex: 0,
      }}
      className="nav-pill"
    />
  );
}
