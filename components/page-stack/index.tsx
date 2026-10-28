"use client";

import { motion, type Transition } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import {
  clearNativePopPending,
  isNativePopPending,
  useNavigationStack,
} from "@/lib/navigation-stack";
import {
  classifyStackChange,
  type DisplayEntry,
  stableEntries,
  topIndex,
  withPopped,
  withPushed,
} from "./display-entries";

// iOS-style decelerate easing
const TRANSITION: Transition = {
  type: "tween",
  duration: 0.32,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

export function PageStack() {
  const { entries } = useNavigationStack();

  const [display, setDisplay] = useState<DisplayEntry[]>(() =>
    stableEntries(entries),
  );
  const prevRef = useRef(entries);

  useEffect(() => {
    const prev = prevRef.current;
    const curr = entries;
    prevRef.current = curr;

    if (curr === prev) return;

    const change = classifyStackChange(prev, curr);
    if (change === "push") {
      setDisplay((current) => withPushed(current, curr));
    } else if (change === "pop" && !isNativePopPending()) {
      // Programmatic pop (back button click) — slide the leaving page out.
      setDisplay((current) => withPopped(current, curr));
    } else {
      // Native back gesture (it already animated the transition) or a reset
      // (tab switch, Next.js hard navigation) — swap instantly.
      if (change === "pop") clearNativePopPending();
      setDisplay(stableEntries(curr));
    }
  }, [entries]);

  const topIdx = topIndex(display);

  return (
    <>
      {display.map((entry, index) => {
        const isTop = index === topIdx;
        const isAnimating =
          entry.status === "entering" || entry.status === "leaving";
        // Always keep the page directly behind the top rendered and GPU-composited.
        // If it's visibility:hidden the browser can free its GPU texture; when it
        // becomes visible again after a back swipe there's a repaint flash.
        // Keeping it painted (but covered by the opaque top page) eliminates that.
        const isPrevious = !isAnimating && index === topIdx - 1;
        const visible = isTop || isAnimating || isPrevious;

        return (
          <motion.div
            key={entry.id}
            className="fixed inset-0 overflow-visible"
            initial={entry.status === "entering" ? { x: "100%" } : false}
            animate={entry.status === "leaving" ? { x: "100%" } : { x: 0 }}
            transition={TRANSITION}
            onAnimationComplete={() => {
              if (entry.status === "leaving") {
                setDisplay((current) =>
                  current.filter((item) => item.id !== entry.id),
                );
              } else if (entry.status === "entering") {
                setDisplay((current) =>
                  current.map((item) =>
                    item.id === entry.id
                      ? { ...item, status: "stable" as const }
                      : item,
                  ),
                );
              }
            }}
            style={{
              zIndex: isAnimating ? 100 + index : index + 1,
              visibility: visible ? "visible" : "hidden",
              pointerEvents:
                isTop && entry.status !== "entering" ? "auto" : "none",
              // Keep top + previous on a dedicated GPU layer so the browser doesn't
              // discard and re-upload the texture between navigations.
              willChange: isTop || isPrevious ? "transform" : "auto",
            }}
          >
            <div
              aria-hidden
              className="app-full-bleed-background pointer-events-none absolute z-0"
            />
            <div className="absolute inset-0 z-[1] overflow-y-auto pb-0 [-webkit-overflow-scrolling:touch]">
              <PageErrorBoundary>{entry.element}</PageErrorBoundary>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
