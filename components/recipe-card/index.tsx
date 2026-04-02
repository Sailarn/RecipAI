"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RecipeImage } from "@/components/recipe-image";
import { Card } from "@/components/ui/card";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeCardProps {
  recipe: Recipe;
  priority?: boolean;
}

export function RecipeCard({ recipe, priority = false }: RecipeCardProps) {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();
  const t = useTranslations("recipes");

  return (
    <Card
      onClick={() => navigate.push(routes.recipes.detail(locale, recipe.id))}
      className="cursor-pointer transition-all h-full flex flex-col gap-0 p-0 rounded-xl border-0 shadow-md hover:shadow-xl overflow-hidden"
      style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
    >
      <div className="relative w-full h-32 overflow-hidden">
        <RecipeImage
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          sizes="(max-width: 768px) 50vw, 33vw"
          width={300}
          height={128}
          priority={priority}
        />
        {recipe.category && (
          <span
            className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[recipe.category] ?? "bg-gray-400 text-gray-950"}`}
          >
            {recipe.category}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 p-2 gap-1">
        <h2 className="text-sm font-semibold line-clamp-2 leading-tight">
          {recipe.title}
        </h2>
        {recipe.servings && (
          <p
            className="text-xs mt-auto"
            style={{ color: "var(--muted-foreground)" }}
          >
            🍽️ {recipe.servings} {t("servings")}
          </p>
        )}
      </div>
    </Card>
  );
}
