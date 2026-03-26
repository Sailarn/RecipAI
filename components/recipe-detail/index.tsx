"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { deleteRecipe, getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { RecipeImage } from "../recipe-image";
import { DeleteModal } from "./delete-modal";
import { IngredientsList } from "./ingredients-list";
import { InstructionsList } from "./instructions-list";
import { RecipeHeader } from "./recipe-header";
import { RecipeMeta } from "./recipe-meta";

interface RecipeDetailProps {
  recipeId: string;
  locale: string;
}

export function RecipeDetail({ recipeId, locale }: RecipeDetailProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    getRecipe(recipeId)
      .then((recipe) => setRecipe(recipe ?? null))
      .finally(() => setLoading(false));
  }, [recipeId]);

  const handleDelete = async () => {
    await deleteRecipe(recipeId);
    router.push(`/${locale}/recipes`);
  };

  if (loading) {
    return <div className="text-center py-12">{t("loading")}</div>;
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          {tRecipes("recipeNotFound")}
        </p>
        <Link
          href={`/${locale}/recipes`}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {tRecipes("backToRecipes")}
        </Link>
      </div>
    );
  }
  console.log(recipe);
  return (
    <div className="max-w-3xl mx-auto p-4">
      <RecipeHeader
        locale={locale}
        recipeId={recipeId}
        onDeleteClick={() => setShowDeleteConfirm(true)}
      />
      <div className="relative w-full h-64 md:h-80 overflow-hidden rounded-lg mb-6">
        <RecipeImage
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          sizes="100vw"
          width={800}
          height={320}
        />
      </div>

      <h1 className="text-4xl font-bold mb-4">{recipe.title}</h1>
      {recipe.description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {recipe.description}
        </p>
      )}

      <RecipeMeta
        servings={recipe.servings}
        prepTime={recipe.prepTime}
        cookTime={recipe.cookTime}
        totalTime={recipe.totalTime}
      />

      <IngredientsList ingredients={recipe.ingredients} />
      <InstructionsList instructions={recipe.instructions} />

      <DeleteModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
