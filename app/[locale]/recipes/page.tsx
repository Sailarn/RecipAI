"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type CSSProperties, useEffect, useRef } from "react";
import { RecipeEmptyState } from "@/components/recipe-empty-state";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeListError } from "@/components/recipe-list-error";
import { RecipeListSkeleton } from "@/components/recipe-list-skeleton";
import { RecipeVirtualList } from "@/components/recipe-virtual-list";
import { RecipesPageOverlays } from "@/components/recipes-page-overlays";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRecipesPageState } from "@/hooks/use-recipes-page-state";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";
import { getGreeting } from "@/lib/greeting";
import { prewarmRecipeImages } from "@/lib/prewarm-recipe-images";
import { useTriggerSync } from "@/lib/sync-context";

const ParsedRecipesSheet = dynamic(
  () =>
    import("@/components/parsed-recipes-sheet").then(
      (parsedRecipesSheetModule) => ({
        default: parsedRecipesSheetModule.ParsedRecipesSheet,
      }),
    ),
  { ssr: false },
);

export default function RecipesPage() {
  const t = useTranslations("recipes");
  const {
    recipes,
    loading,
    recipesError,
    collections,
    getMissing,
    filter,
    newCollectionModal,
    editCollectionModal,
  } = useRecipesPageState();
  const {
    search,
    setSearch,
    sort,
    setSort,
    category,
    setCategory,
    status,
    setStatus,
    collectionId,
    setCollectionId,
    filtered,
  } = filter;
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isCollapsed = useScrollCollapse(scrollRef, sentinelRef, !loading);

  // Prewarm every recipe's detail hero image into the SW cache during idle time
  // so opening a recipe shows its photo instantly. Deduped across remounts.
  useEffect(() => {
    if (recipes) prewarmRecipeImages(recipes);
  }, [recipes]);

  const triggerSync = useTriggerSync();
  const { indicatorRef, isRefreshing } = usePullToRefresh({
    enabled: recipes !== undefined && !recipesError,
    onRefresh: triggerSync,
    scrollRef,
  });

  if (recipesError) return <RecipeListError />;
  if (recipes === undefined) return <RecipeListSkeleton />;

  const isEmpty = recipes.length === 0;

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto"
      style={{ WebkitOverflowScrolling: "touch" as never }}
    >
      {/* Pull-to-refresh indicator — height driven directly via DOM ref, no React re-renders during drag */}
      <div
        ref={indicatorRef}
        className="flex box-border h-[calc(var(--pull-height)+env(safe-area-inset-top))] justify-center items-center pt-[env(safe-area-inset-top)] text-sm overflow-hidden text-[var(--fg-3)]"
        style={
          {
            "--pull-height": "0px",
            opacity: 0,
          } as CSSProperties
        }
      >
        {isRefreshing ? "Refreshing…" : "↓ Release to refresh"}
      </div>

      {/* Greeting, title, notifications bell — always visible so parsed recipes are always reachable */}
      <div className="pt-5 px-3.5">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-[0.1em] mb-[3px] font-sans">
              {getGreeting()}
            </p>
            <h1 className="font-heading text-[26px] font-extrabold text-[var(--fg-1)] leading-[1.1]">
              {t("title")}
            </h1>
          </div>

          <ParsedRecipesSheet />
        </div>

        {!isEmpty && (
          <RecipeFilterBar
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            category={category}
            onCategoryChange={setCategory}
            status={status}
            onStatusChange={setStatus}
            collections={collections}
            activeCollectionId={collectionId}
            onCollectionChange={setCollectionId}
            onCreateCollection={newCollectionModal.open}
            onCollectionLongPress={editCollectionModal.open}
          />
        )}
      </div>

      {isEmpty ? (
        <RecipeEmptyState />
      ) : (
        <>
          {/* Sentinel — when this exits the scroll container, compact bar appears */}
          <div ref={sentinelRef} className="h-0" />

          {/* Recipe list — virtualised: only visible rows are in the DOM */}
          <RecipeVirtualList
            filtered={filtered}
            collections={collections}
            getMissing={getMissing}
            scrollRef={scrollRef}
            hasActiveSearch={!!search}
          />
          {/* Nav bar clearance — outside the virtualiser so it always adds to scroll height */}
          <div className="h-[110px]" />
        </>
      )}

      <RecipesPageOverlays
        isCollapsed={isCollapsed}
        filter={filter}
        collections={collections}
        newCollectionModal={newCollectionModal}
        editCollectionModal={editCollectionModal}
        onScrollTop={() =>
          scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
        }
      />
    </div>
  );
}
