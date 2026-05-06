"use client";

import { Plus } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeEmptyState } from "@/components/recipe-empty-state";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeListSkeleton } from "@/components/recipe-list-skeleton";
import { RecipeNewView } from "@/components/recipe-new-view";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRecipeFilter } from "@/hooks/use-recipe-filter";
import { useSyncOnLogin } from "@/hooks/use-sync-on-login";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

let _recipesCache: Recipe[] | undefined;

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
  const params = useParams();
  const navigate = useNavigate();
  const locale = params.locale as string;
  const t = useTranslations("recipes");
  const recipesFromDB = useLiveQuery(() => getAllRecipes(), []);
  if (recipesFromDB !== undefined) _recipesCache = recipesFromDB;
  const recipes = recipesFromDB ?? _recipesCache;
  const loading = recipes === undefined;
  const { search, setSearch, sort, setSort, category, setCategory, filtered } =
    useRecipeFilter(recipes ?? []);
  const { triggerSync } = useSyncOnLogin();
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: triggerSync,
  });

  if (loading) return <RecipeListSkeleton />;
  if (recipes.length === 0) return <RecipeEmptyState />;

  return (
    <div
      style={{
        paddingTop: "max(64px, calc(env(safe-area-inset-top) + 24px))",
        paddingBottom: 110,
        paddingLeft: 14,
        paddingRight: 14,
        position: "relative",
        zIndex: 1,
      }}
    >
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center text-sm pb-2 transition-all"
          style={{ height: pullDistance || 32, color: "var(--fg-3)" }}
        >
          {isRefreshing ? "Refreshing…" : "↓ Release to refresh"}
        </div>
      )}

      {/* Header */}
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

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ParsedRecipesSheet />
          <button
            type="button"
            onClick={() =>
              navigate.push(
                routes.recipes.new(locale),
                <RecipeNewView locale={locale} />,
              )
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "var(--action-primary)",
              color: "#fff",
              borderRadius: 14,
              padding: "8px 14px",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
            }}
          >
            <Plus size={13} strokeWidth={2.5} color="#fff" />
            {t("createRecipe")}
          </button>
        </div>
      </div>

      <RecipeFilterBar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        category={category}
        onCategoryChange={setCategory}
      />

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
            <RecipeCard key={recipe.id} recipe={recipe} priority={index < 2} />
          ))}
        </div>
      )}
    </div>
  );
}
