"use client";

import type { MotionValue } from "motion/react";
import { motion, useMotionValue } from "motion/react";
import { useLayoutEffect } from "react";
import { PILL_H, PILL_W } from "./use-bottom-nav";

interface NavPillProps {
  leftMv: MotionValue<number>;
  yNormal: number;
  /** When true the pill is hidden immediately but leftMv still tracks the slot,
   *  so when isHidden goes false again the pill springs away from the correct
   *  position without any extra snap. */
  isHidden?: boolean;
}

/**
 * The glass pill indicator that slides under the active nav item.
 * Position is driven by leftMv (a MotionValue animated by the spring in
 * useBottomNav). All other dimensions are static CSS — no Motion animate
 * props, which avoids the "grow-in" flash that occurred on first mount when
 * width/height were missing from initial.
 *
 * Visibility (opacity) is updated synchronously via useLayoutEffect so it
 * changes in the same frame as the parent's spring — no render-cycle gap.
 */
export function NavPill({ leftMv, yNormal, isHidden }: NavPillProps) {
  const opacityMv = useMotionValue(isHidden ? 0 : 1);

  useLayoutEffect(() => {
    opacityMv.set(isHidden ? 0 : 1);
  }, [isHidden, opacityMv]);

  return (
    <motion.div
      className="nav-pill"
      style={{
        position: "absolute",
        top: yNormal,
        left: leftMv,
        width: PILL_W,
        height: PILL_H,
        borderRadius: 28,
        pointerEvents: "none",
        zIndex: 0,
        opacity: opacityMv,
      }}
    />
  );
}
