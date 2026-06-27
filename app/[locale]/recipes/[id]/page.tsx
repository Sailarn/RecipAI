import type { Metadata } from "next";
import { RecipeDetail } from "@/components/recipe-detail";
import { getPublicRecipe } from "@/lib/public-recipes/server";

interface RecipePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: RecipePageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getPublicRecipe(id);
  const robots = { index: false, follow: false };
  if (!recipe) return { title: "Recipe unavailable", robots };
  return {
    title: recipe.title,
    description: recipe.description,
    robots,
    openGraph: {
      type: "article",
      title: recipe.title,
      description: recipe.description,
      images: recipe.imageUrl ? [{ url: recipe.imageUrl }] : undefined,
    },
  };
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { locale, id } = await params;
  const publicRecipe = await getPublicRecipe(id);
  return (
    <RecipeDetail recipeId={id} locale={locale} publicRecipe={publicRecipe} />
  );
}
