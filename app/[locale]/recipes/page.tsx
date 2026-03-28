"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { RecipeFilterBar } from "@/components/recipe-filter-bar";
import { RecipeImage } from "@/components/recipe-image";
import { Button, Card } from "@/components/ui";
import { useRecipeFilter } from "@/hooks/use-recipe-filter";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { useNavigate } from "@/lib/transitions";
import { routes } from "@/lib/routes";

export default function RecipesPage() {
  const params = useParams();
  const navigate = useNavigate();
  const locale = params.locale as string;
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const { search, setSearch, sort, setSort, filtered } =
    useRecipeFilter(recipes);

  useEffect(() => {
    getAllRecipes()
      .then((recipes) => setRecipes(recipes))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4">{t("loading")}</div>;
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <p
          className="text-lg mb-4"
          style={{ color: "var(--muted-foreground)" }}
        >
          {t("noRecipes")}
        </p>
        <Button onClick={() => navigate.push(routes.recipes.new(locale))}>
          {t("createFirst")}
        </Button>
      </div>
    );
  }

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
              <Card
                key={recipe.id}
                onClick={() => navigate.push(routes.recipes.detail(locale, recipe.id))}
                hover
              >
                <div className="flex flex-col h-full">
                  <div className="relative w-full h-48 mb-3 overflow-hidden rounded-md">
                    <RecipeImage
                      imageUrl={recipe.imageUrl}
                      title={recipe.title}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      width={600}
                      height={192}
                    />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{recipe.title}</h2>
                  <div className="flex-1">
                    {recipe.description && (
                      <p
                        className="text-sm line-clamp-2"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {recipe.description}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex gap-4 mt-3 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {recipe.prepTime && (
                      <span>
                        ⏱️ {recipe.prepTime} {tCommon("minutes")}
                      </span>
                    )}
                    {recipe.servings && (
                      <span>
                        🍽️ {recipe.servings} {t("servings")}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
