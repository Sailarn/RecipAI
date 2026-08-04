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

// Deliberately does NOT await getPublicRecipe. The overwhelmingly common case
// is opening your own recipe, which lives in Dexie — blocking the shell on a
// Supabase round-trip only to hand down `null` made every deep link pay for
// the rare share case. RecipeDetail already resolves a public recipe itself
// (fetchPublicRecipe) when it can't find the id locally, which is the path
// Telegram deep links have always taken. The DB read stays in
// generateMetadata above, where streaming metadata keeps it off the critical
// path for browsers.
export default async function RecipePage({ params }: RecipePageProps) {
  const { locale, id } = await params;
  return <RecipeDetail recipeId={id} locale={locale} />;
}
