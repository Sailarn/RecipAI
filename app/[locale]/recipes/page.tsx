"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ParsedRecipesSheet } from "@/components/parsed-recipes-sheet";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeEmptyState } from "@/components/recipe-empty-state";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeListSkeleton } from "@/components/recipe-list-skeleton";
import { Button } from "@/components/ui/button";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { useRecipeFilter } from "@/hooks/use-recipe-filter";
import { useSyncOnLogin } from "@/hooks/use-sync-on-login";
import { getAllRecipes } from "@/lib/db/recipes";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

export default function RecipesPage() {
  const params = useParams();
  const navigate = useNavigate();
  const locale = params.locale as string;
  const t = useTranslations("recipes");
  const recipes = useLiveQuery(() => getAllRecipes(), []) ?? [];
  const loading = recipes === undefined;
  const { search, setSearch, sort, setSort, category, setCategory, filtered } =
    useRecipeFilter(recipes);
  const { triggerSync } = useSyncOnLogin();
  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: triggerSync,
  });

  if (loading) return <RecipeListSkeleton />;
  if (recipes.length === 0) return <RecipeEmptyState />;

  return (
    <div className="p-4">
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center text-muted-foreground text-sm pb-2 transition-all"
          style={{ height: pullDistance || 32 }}
        >
          {isRefreshing ? "Refreshing..." : "↓ Release to refresh"}
        </div>
      )}
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1
              className="text-3xl font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {t("title")}
            </h1>
            <div className="flex items-center gap-2">
              <ParsedRecipesSheet />
              <Button onClick={() => navigate.push(routes.recipes.new(locale))}>
                {t("createRecipe")}
              </Button>
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
              className="text-center py-12 text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t("noResults")}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
