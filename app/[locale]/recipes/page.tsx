"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CompactFilterBar } from "@/components/compact-filter-bar";
import { EditCollectionModal } from "@/components/edit-collection-modal";
import { NewCollectionModal } from "@/components/new-collection-modal";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeEmptyState } from "@/components/recipe-empty-state";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeListSkeleton } from "@/components/recipe-list-skeleton";
import { useLiveQueryTransition } from "@/hooks/use-live-query-transition";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRecipeFilter } from "@/hooks/use-recipe-filter";
import { useRecipeMatcher } from "@/hooks/use-recipe-matcher";
import { useSyncOnLogin } from "@/hooks/use-sync-on-login";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
  renameCollection,
} from "@/lib/db/collections";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Collection } from "@/lib/db/schema";
import { recipesPageCache } from "@/lib/recipes-prefetch";

const ParsedRecipesSheet = dynamic(
  () =>
    import("@/components/parsed-recipes-sheet").then((m) => ({
      default: m.ParsedRecipesSheet,
    })),
  { ssr: false },
);

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function RecipesPage() {
  const t = useTranslations("recipes");
  const recipesFromDB = useLiveQueryTransition(() => getAllRecipes(), []);
  if (recipesFromDB !== undefined) recipesPageCache.recipes = recipesFromDB;
  const recipes = recipesFromDB ?? recipesPageCache.recipes;
  const loading = recipes === undefined;
  const { getMissing } = useRecipeMatcher();
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
  } = useRecipeFilter(recipes ?? [], getMissing);
  const collectionsFromDB = useLiveQueryTransition(
    () => getAllCollections(),
    [],
  );
  if (collectionsFromDB !== undefined)
    recipesPageCache.collections = collectionsFromDB;
  const collections = collectionsFromDB ?? recipesPageCache.collections ?? [];
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (loading) return;
    const container = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;
    setIsCollapsed(
      sentinel.getBoundingClientRect().top <
        container.getBoundingClientRect().top,
    );
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const container = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;
    const check = () =>
      setIsCollapsed(
        sentinel.getBoundingClientRect().top <
          container.getBoundingClientRect().top,
      );
    container.addEventListener("scroll", check, { passive: true });
    return () => container.removeEventListener("scroll", check);
  }, [loading]);

  // Group filtered recipes into rows of 2 for the virtualizer.
  // All filtering/sorting runs on the full array; the virtualizer only renders
  // the visible slice.
  const rows = useMemo(() => {
    const result: (typeof filtered)[] = [];
    for (let i = 0; i < filtered.length; i += 2) {
      result.push(filtered.slice(i, i + 2));
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

  const { triggerSync } = useSyncOnLogin();
  const { indicatorRef, isRefreshing } = usePullToRefresh({
    onRefresh: triggerSync,
  });

  if (loading) return <RecipeListSkeleton />;
  if (recipes.length === 0) return <RecipeEmptyState />;

  return (
    <div
      ref={scrollRef}
      style={{
        height: "100%",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch" as never,
      }}
    >
      {/* Pull-to-refresh indicator — height driven directly via DOM ref, no React re-renders during drag */}
      <div
        ref={indicatorRef}
        className="flex justify-center items-center text-sm overflow-hidden"
        style={{ height: 0, color: "var(--fg-3)" }}
      >
        {isRefreshing ? "Refreshing…" : "↓ Release to refresh"}
      </div>

      {/* Greeting, title, actions + filter bar — all scroll away */}
      <div
        style={{
          paddingTop: "max(20px, calc(env(safe-area-inset-top) + 8px))",
          paddingLeft: 14,
          paddingRight: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 16,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--fg-3)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 3,
                fontFamily: "var(--font-sans)",
              }}
            >
              {getGreeting()}
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 800,
                color: "var(--fg-1)",
                lineHeight: 1.1,
              }}
            >
              {t("title")}
            </h1>
          </div>

          <ParsedRecipesSheet />
        </div>

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
          onCreateCollection={() => setShowNewCollection(true)}
          onCollectionLongPress={setEditingCollection}
        />
      </div>

      {/* Sentinel — when this exits the scroll container, compact bar appears */}
      <div ref={sentinelRef} style={{ height: 0 }} />

      {/* Recipe list — virtualised: only visible rows are in the DOM */}
      {filtered.length === 0 && search ? (
        <p
          style={{
            textAlign: "center",
            padding: "40px 0",
            fontSize: 13,
            color: "var(--fg-2)",
            lineHeight: 1.8,
          }}
        >
          {t("noResults")}
        </p>
      ) : (
        <div
          style={{
            marginTop: 12,
            position: "relative",
            height: virtualizer.getTotalSize(),
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowItems = rows[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  // border-box so left/right padding doesn't push width beyond 100%
                  boxSizing: "border-box",
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  paddingLeft: 14,
                  paddingRight: 14,
                  paddingBottom: 10,
                }}
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
      )}
      {/* Nav bar clearance — outside the virtualiser so it always adds to scroll height */}
      <div style={{ height: 110 }} />

      {/* Compact bar — fixed at top when filter bar has scrolled off screen */}
      {isCollapsed && (
        <CompactFilterBar
          activeCollectionId={collectionId}
          collections={collections}
          search={search}
          sort={sort}
          category={category}
          status={status}
          onScrollTop={() =>
            scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
          }
        />
      )}

      {showNewCollection && (
        <NewCollectionModal
          onClose={() => setShowNewCollection(false)}
          onCreate={async ({ name, emoji }) => {
            await createCollection({ name, emoji });
            setShowNewCollection(false);
          }}
        />
      )}
      {editingCollection && (
        <EditCollectionModal
          collection={editingCollection}
          onClose={() => setEditingCollection(null)}
          onSave={async ({ name, emoji }) => {
            await renameCollection(editingCollection.id, name, emoji);
          }}
          onDelete={async () => {
            await deleteCollection(editingCollection.id);
            if (collectionId === editingCollection.id) setCollectionId(null);
          }}
        />
      )}
    </div>
  );
}
