"use client";

import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CompactFilterBar } from "@/components/compact-filter-bar";
import { EditCollectionModal } from "@/components/edit-collection-modal";
import { NewCollectionModal } from "@/components/new-collection-modal";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeEmptyState } from "@/components/recipe-empty-state";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeListSkeleton } from "@/components/recipe-list-skeleton";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRecipeFilter } from "@/hooks/use-recipe-filter";
import { useSyncOnLogin } from "@/hooks/use-sync-on-login";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
  renameCollection,
} from "@/lib/db/collections";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Collection, Recipe } from "@/lib/db/schema";

let _recipesCache: Recipe[] | undefined;
let _collectionsCache: Collection[] | undefined;

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
  const recipesFromDB = useLiveQuery(() => getAllRecipes(), []);
  if (recipesFromDB !== undefined) _recipesCache = recipesFromDB;
  const recipes = recipesFromDB ?? _recipesCache;
  const loading = recipes === undefined;
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
  } = useRecipeFilter(recipes ?? []);
  const collectionsFromDB = useLiveQuery(() => getAllCollections(), []);
  if (collectionsFromDB !== undefined) _collectionsCache = collectionsFromDB;
  const collections = collectionsFromDB ?? _collectionsCache ?? [];
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

  const { triggerSync } = useSyncOnLogin();
  const { pullDistance, isRefreshing } = usePullToRefresh({
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
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center text-sm transition-all"
          style={{
            height: pullDistance || 32,
            color: "var(--fg-3)",
            paddingTop: 8,
          }}
        >
          {isRefreshing ? "Refreshing…" : "↓ Release to refresh"}
        </div>
      )}

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

      {/* Recipe list */}
      <div
        style={{
          paddingLeft: 14,
          paddingRight: 14,
          paddingBottom: 110,
        }}
      >
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
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            {filtered.map((recipe, index) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                collections={collections}
                priority={index < 2}
              />
            ))}
          </div>
        )}
      </div>

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
