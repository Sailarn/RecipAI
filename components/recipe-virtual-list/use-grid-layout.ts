import { type RefObject, useEffect, useState } from "react";
import type { CardLayout } from "@/components/recipe-card/constants";

// Below this container width the list stays the two-column phone grid.
const TILE_LAYOUT_MIN_WIDTH = 640;
// Wide screens pack as many ~300px square tiles as fit, instead of stretching
// two cards across the whole screen.
const TILE_TARGET_WIDTH = 300;
const MIN_COLUMNS = 2;
// Must match the row's px-3.5 (14px each side) and gap-2.5 / pb-2.5 (10px).
const GRID_SIDE_PADDING = 28;
const GRID_GAP = 10;
// image (96) + content area (64: p-2 + 2-line title + servings) + row gap.
const COMPACT_ROW_HEIGHT = 170;

export interface GridLayout {
  layout: CardLayout;
  columns: number;
  /** Row height estimate for the virtualizer; measureElement corrects it. */
  estimatedRowHeight: number;
}

export function gridTemplateColumns(columns: number): string {
  return `repeat(${columns}, minmax(0, 1fr))`;
}

export function gridLayoutFor(containerWidth: number): GridLayout {
  if (containerWidth < TILE_LAYOUT_MIN_WIDTH) {
    return {
      layout: "compact",
      columns: MIN_COLUMNS,
      estimatedRowHeight: COMPACT_ROW_HEIGHT,
    };
  }

  const usableWidth = containerWidth - GRID_SIDE_PADDING;
  const columns = Math.max(
    MIN_COLUMNS,
    Math.floor((usableWidth + GRID_GAP) / (TILE_TARGET_WIDTH + GRID_GAP)),
  );
  const tileWidth = (usableWidth - GRID_GAP * (columns - 1)) / columns;
  return {
    layout: "tile",
    columns,
    estimatedRowHeight: Math.round(tileWidth) + GRID_GAP,
  };
}

export function useGridLayout(
  containerRef: RefObject<HTMLElement | null>,
): GridLayout {
  // Seeded from the viewport so desktop never paints a frame of the phone
  // grid. Safe from hydration mismatch: the list only renders client-side,
  // once Dexie has loaded. The effect then measures the real container — it
  // can't be a layout effect, since the parent's scrollRef attaches after
  // this child's layout effects run.
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof window === "undefined" ? 0 : window.innerWidth,
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setContainerWidth(container.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setContainerWidth(container.clientWidth);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return gridLayoutFor(containerWidth);
}
