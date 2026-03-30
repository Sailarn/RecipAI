"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeEmptyState } from "@/components/recipe-empty-state";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeListSkeleton } from "@/components/recipe-list-skeleton";
import { Button } from "@/components/ui/button";
import { useRecipeFilter } from "@/hooks/use-recipe-filter";
import { useSyncOnLogin } from "@/hooks/use-sync-on-login";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

export default function RecipesPage() {
  const params = useParams();
  const navigate = useNavigate();
  const locale = params.locale as string;
  const t = useTranslations("recipes");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, setSearch, sort, setSort, filtered } =
    useRecipeFilter(recipes);

  useSyncOnLogin();

  useEffect(() => {
    getAllRecipes()
      .then((recipes) => setRecipes(recipes))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <RecipeListSkeleton />;
  if (recipes.length === 0) return <RecipeEmptyState />;

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {t("title")}
          </h1>
          <Button onClick={() => navigate.push(routes.recipes.new(locale))}>
            {t("createRecipe")}
          </Button>
        </div>
        <RecipeFilterBar
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
        />
        {filtered.length === 0 && search ? (
          <p
            className="text-center py-12 text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("noResults")}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
