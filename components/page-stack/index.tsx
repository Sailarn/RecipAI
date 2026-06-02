"use client";

import { motion, type Transition } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  clearNativePopPending,
  isNativePopPending,
  type StackEntry,
  useNavigationStack,
} from "@/lib/navigation-stack";

type Status = "stable" | "entering" | "leaving";
type DisplayEntry = StackEntry & { status: Status };

// iOS-style decelerate easing
const TRANSITION: Transition = {
  type: "tween",
  duration: 0.32,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

export function PageStack() {
  const { entries } = useNavigationStack();

  const [display, setDisplay] = useState<DisplayEntry[]>(() =>
    entries.map((entry) => ({ ...entry, status: "stable" })),
  );
  const prevRef = useRef(entries);

  useEffect(() => {
    const prev = prevRef.current;
    const curr = entries;
    prevRef.current = curr;

    if (curr === prev) return;

    const isPush =
      curr.length > prev.length &&
      curr
        .slice(0, prev.length)
        .every((entry, index) => entry.id === prev[index].id);

    const isPop =
      curr.length < prev.length &&
      curr.length > 0 &&
      curr.every((entry, index) => entry.id === prev[index].id);

    if (isPush) {
      const incoming = curr[curr.length - 1];
      setDisplay((current) => [
        ...current.map((entry) => ({ ...entry, status: "stable" as Status })),
        { ...incoming, status: "entering" as Status },
      ]);
    } else if (isPop) {
      if (isNativePopPending()) {
        // Native gesture already animated the transition — just swap instantly.
        clearNativePopPending();
        setDisplay(
          curr.map((entry) => ({ ...entry, status: "stable" as Status })),
        );
      } else {
        // Programmatic pop (back button click) — slide the leaving page out.
        setDisplay((current) =>
          current.map((entry, index) =>
            index === current.length - 1
              ? { ...entry, status: "leaving" as Status }
              : { ...entry, status: "stable" as Status },
          ),
        );
      }
    } else {
      // Reset (tab switch, Next.js hard navigation) — no animation.
      setDisplay(
        curr.map((entry) => ({ ...entry, status: "stable" as Status })),
      );
    }
  }, [entries]);

  // Last non-leaving entry is the "active top" — visible beneath any leaving page.
  const topIdx = display.reduce(
    (topAccumulator, entry, index) =>
      entry.status !== "leaving" ? index : topAccumulator,
    -1,
  );

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
                      ? { ...item, status: "stable" as Status }
                      : item,
                  ),
                );
              }
            }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch" as never,
              paddingBottom: 0,
              background: "var(--app-mesh)",
              zIndex: isAnimating ? 100 + index : index + 1,
              visibility: visible ? "visible" : "hidden",
              pointerEvents:
                isTop && entry.status !== "entering" ? "auto" : "none",
              // Keep top + previous on a dedicated GPU layer so the browser doesn't
              // discard and re-upload the texture between navigations.
              willChange: isTop || isPrevious ? "transform" : "auto",
            }}
          >
            {entry.element}
          </motion.div>
        );
      })}
    </>
  );
}
