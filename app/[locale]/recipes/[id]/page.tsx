"use client";

import { useParams } from "next/navigation";
import { RecipeDetail } from "@/components/recipe-detail";

export default function RecipeDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  return <RecipeDetail recipeId={id} locale={locale} />;
}
