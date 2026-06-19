"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslations } from "next-intl";
import { type RefObject, useMemo } from "react";
import { RecipeCard } from "@/components/recipe-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Collection, Recipe } from "@/lib/db/schema";

const skeletonCardIds = ["a", "b", "c", "d", "e", "f"];

interface RecipeVirtualListProps {
  filtered: Recipe[];
  collections: Collection[];
  getMissing: (recipe: Recipe) => { missing: number; total: number } | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  hasActiveSearch: boolean;
}

function RecipeGridSkeleton() {
  return (
    <div
      data-testid="recipe-grid-skeleton"
      className="mt-3 grid grid-cols-2 gap-2.5 px-3.5"
    >
      {skeletonCardIds.map((id) => (
        <div key={id} className="flex flex-col gap-2 rounded-xl bg-card p-2">
          <Skeleton className="h-24 w-full rounded-lg" />
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
}: RecipeVirtualListProps) {
  const t = useTranslations("recipes");

  // Group filtered recipes into rows of 2 for the virtualizer.
  // All filtering/sorting runs on the full array; the virtualizer only renders
  // the visible slice.
  const rows = useMemo(() => {
    const result: Recipe[][] = [];
    for (let index = 0; index < filtered.length; index += 2) {
      result.push(filtered.slice(index, index + 2));
    }
    return result;
  }, [filtered]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    // 170px: image (96) + content area (64: p-2 + 2-line title + servings) + row paddingBottom (10).
    // Keeping the estimate close to real height minimises the correction render
    // that measureElement fires after first paint.
    estimateSize: () => 170,
    overscan: 5,
  });
  const virtualRows = virtualizer.getVirtualItems();

  if (filtered.length === 0 && hasActiveSearch) {
    return (
      <p className="text-center py-10 text-[13px] text-[var(--fg-2)] leading-[1.8]">
        {t("noResults")}
      </p>
    );
  }

  if (filtered.length > 0 && virtualRows.length === 0) {
    return <RecipeGridSkeleton />;
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
            className="absolute top-0 left-0 w-full box-border grid grid-cols-2 gap-2.5 px-3.5 pb-2.5"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {rowItems.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                collections={collections}
                priority={virtualRow.index === 0}
                pantryMatch={getMissing(recipe)}
              />
            ))}
            {/* Keep grid balanced when the last row has one card */}
            {rowItems.length === 1 && <div />}
          </div>
        );
      })}
    </div>
  );
}
