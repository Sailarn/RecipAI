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
    entries.map((e) => ({ ...e, status: "stable" })),
  );
  const prevRef = useRef(entries);

  useEffect(() => {
    const prev = prevRef.current;
    const curr = entries;
    prevRef.current = curr;

    if (curr === prev) return;

    const isPush =
      curr.length > prev.length &&
      curr.slice(0, prev.length).every((e, i) => e.id === prev[i].id);

    const isPop =
      curr.length < prev.length &&
      curr.length > 0 &&
      curr.every((e, i) => e.id === prev[i].id);

    if (isPush) {
      const incoming = curr[curr.length - 1];
      setDisplay((d) => [
        ...d.map((e) => ({ ...e, status: "stable" as Status })),
        { ...incoming, status: "entering" as Status },
      ]);
    } else if (isPop) {
      if (isNativePopPending()) {
        // Native gesture already animated the transition — just swap instantly.
        clearNativePopPending();
        setDisplay(curr.map((e) => ({ ...e, status: "stable" as Status })));
      } else {
        // Programmatic pop (back button click) — slide the leaving page out.
        setDisplay((d) =>
          d.map((e, i) =>
            i === d.length - 1
              ? { ...e, status: "leaving" as Status }
              : { ...e, status: "stable" as Status },
          ),
        );
      }
    } else {
      // Reset (tab switch, Next.js hard navigation) — no animation.
      setDisplay(curr.map((e) => ({ ...e, status: "stable" as Status })));
    }
  }, [entries]);

  // Last non-leaving entry is the "active top" — visible beneath any leaving page.
  const topIdx = display.reduce(
    (acc, e, i) => (e.status !== "leaving" ? i : acc),
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
                setDisplay((d) => d.filter((e) => e.id !== entry.id));
              } else if (entry.status === "entering") {
                setDisplay((d) =>
                  d.map((e) =>
                    e.id === entry.id
                      ? { ...e, status: "stable" as Status }
                      : e,
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
              paddingBottom: "6rem",
              backgroundColor: "var(--background)",
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
