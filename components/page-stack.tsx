"use client";

import { useNavigationStack } from "@/lib/navigation-stack";

export function PageStack() {
  const { entries } = useNavigationStack();

  return (
    <>
      {entries.map((entry, index) => {
        const isTop = index === entries.length - 1;
        return (
          <div
            key={entry.id}
            style={
              isTop
                ? {
                    position: "relative",
                    zIndex: index + 1,
                    willChange: "transform",
                  }
                : {
                    position: "fixed",
                    inset: 0,
                    zIndex: index + 1,
                    visibility: "hidden",
                    pointerEvents: "none",
                    overflow: "hidden",
                  }
            }
          >
            {entry.element}
          </div>
        );
      })}
    </>
  );
}
