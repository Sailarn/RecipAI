"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getAllRecipes } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { useTranslations } from "next-intl";

export default function RecipesPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  useEffect(() => {
    getAllRecipes()
      .then(setRecipes)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12">{tCommon("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <Link
          href={`/${locale}/recipes/new`}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          {t("createRecipe")}
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t("noRecipes")}
          </p>
          <Link
            href={`/${locale}/recipes/new`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t("createFirst")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/${locale}/recipes/${recipe.id}`}
              className="block rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-lg transition-shadow"
            >
              {recipe.imageUrl && (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-md mb-4"
                />
              )}
              <h2 className="text-xl font-semibold mb-2">{recipe.title}</h2>
              {recipe.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                  {recipe.description}
                </p>
              )}
              <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{recipe.servings} {t("servings")}</span>
                {recipe.totalTime && <span>{recipe.totalTime} min</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
