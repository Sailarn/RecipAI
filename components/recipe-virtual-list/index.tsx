"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useMemo } from "react";
import { RecipeCard } from "@/components/recipe-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Recipe } from "@/lib/db/schema";
import type { RecipeViewSource } from "@/lib/telemetry/events";
import {
  type GridLayout,
  gridTemplateColumns,
  useGridLayout,
} from "./use-grid-layout";

const skeletonCardIds = ["a", "b", "c", "d", "e", "f"];

interface RecipeVirtualListProps {
  filtered: Recipe[];
  collections: Collection[];
  getMissing: (recipe: Recipe) => { missing: number; total: number } | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  hasActiveSearch: boolean;
  /** Passed straight through to each card, which hands it to the detail view
   *  it pushes — the list itself has no opinion on it. */
  via: RecipeViewSource;
}

function RecipeGridSkeleton({
  layout,
  columns,
}: Pick<GridLayout, "layout" | "columns">) {
  return (
    <div
      data-testid="recipe-grid-skeleton"
      className="mt-3 grid gap-2.5 px-3.5"
      style={{ gridTemplateColumns: gridTemplateColumns(columns) }}
    >
      {skeletonCardIds.map((id) => (
        <div
          key={id}
          data-layout={layout}
          className="flex flex-col gap-2 rounded-xl bg-card p-2 data-[layout=tile]:aspect-square"
        >
          <Skeleton className="h-24 w-full rounded-lg in-data-[layout=tile]:flex-1" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function RecipeVirtualList({
  filtered,
  collections,
  getMissing,
  scrollRef,
  hasActiveSearch,
  via,
}: RecipeVirtualListProps) {
  const t = useTranslations("recipes");
  const { layout, columns, estimatedRowHeight } = useGridLayout(scrollRef);

  // Group filtered recipes into rows of `columns` for the virtualizer.
  // All filtering/sorting runs on the full array; the virtualizer only renders
  // the visible slice.
  const rows = useMemo(() => {
    const result: Recipe[][] = [];
    for (let index = 0; index < filtered.length; index += columns) {
      result.push(filtered.slice(index, index + columns));
    }
    return result;
  }, [filtered, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    // Keeping the estimate close to real height minimises the correction render
    // that measureElement fires after first paint.
    estimateSize: () => estimatedRowHeight,
    // Keep overscan tight: only row 0 gets priority/eager image loading (see
    // RecipeCard), every other card lazy-loads, so a large overscan would
    // eagerly mount rows that aren't near the viewport.
    overscan: 3,
    // On the very first render scrollRef.current is still null, so the default
    // initialRect of { height: 0 } yields zero visible rows and flashes the
    // skeleton for a frame before measurement. Seed a full-screen height so the
    // first paint already includes the above-the-fold cards; the real rect
    // corrects it right after mount.
    initialRect: { width: 0, height: 1000 },
  });
  const virtualRows = virtualizer.getVirtualItems();

  // A column change regroups every row, so cached row heights are stale.
  // biome-ignore lint/correctness/useExhaustiveDependencies: columns is the trigger, not an input
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, columns]);

  if (filtered.length === 0 && hasActiveSearch) {
    return (
      <p className="text-center py-10 text-[13px] text-[var(--fg-2)] leading-[1.8]">
        {t("noResults")}
      </p>
    );
  }

  if (filtered.length > 0 && virtualRows.length === 0) {
    return <RecipeGridSkeleton layout={layout} columns={columns} />;
  }

  return (
    <div
      className="mt-3 relative"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.map((virtualRow) => {
        const rowItems = rows[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute top-0 left-0 w-full box-border grid gap-2.5 px-3.5 pb-2.5"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
              gridTemplateColumns: gridTemplateColumns(columns),
            }}
          >
            {rowItems.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                collections={collections}
                priority={virtualRow.index === 0}
                pantryMatch={getMissing(recipe)}
                via={via}
                layout={layout}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
