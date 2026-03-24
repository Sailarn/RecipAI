"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";

export default function RecipesPage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

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
        <Link href={`/${locale}/recipes/new`}>
          <Button>{t("createFirst")}</Button>
        </Link>
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
          <Link href={`/${locale}/recipes/new`}>
            <Button>{t("createRecipe")}</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/${locale}/recipes/${recipe.id}`}>
              <Card hover>
                <div className="flex flex-col h-full">
                  <div className="relative w-full h-48 mb-3 flex-shrink-0">
                    <Image
                      src={recipe.imageUrl || "/images/recipe-placeholder.png"}
                      alt={recipe.title}
                      fill
                      className="object-cover rounded-md"
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
