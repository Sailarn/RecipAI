"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RecipeImage } from "@/components/recipe-image";
import { Card } from "@/components/ui/card";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();
  const t = useTranslations("recipes");
  const tCommon = useTranslations("common");

  return (
    <Card
      onClick={() => navigate.push(routes.recipes.detail(locale, recipe.id))}
      className="cursor-pointer transition-all h-full flex flex-col gap-0 p-4 rounded-lg border-0 ring-0 shadow-md hover:shadow-xl"
      style={{ backgroundColor: "var(--card)", color: "var(--foreground)" }}
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
  );
}
