"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { RecipeDetail } from "@/components/recipe-detail";
import { RecipeImage } from "@/components/recipe-image";
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
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() =>
        navigate.push(
          routes.recipes.detail(locale, recipe.id),
          <RecipeDetail recipeId={recipe.id} locale={locale} />,
        )
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass-card cursor-pointer h-full flex flex-col gap-0 overflow-hidden"
      style={{
        borderRadius: 22,
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered
          ? "0 8px 36px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,220,130,0.18)"
          : undefined,
        borderColor: hovered ? "rgba(255,210,130,0.28)" : undefined,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease",
      }}
    >
      <div className="relative w-full overflow-hidden" style={{ height: 96 }}>
        <RecipeImage
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          sizes="(max-width: 768px) 50vw, 33vw"
          width={300}
          height={96}
          priority={priority}
        />
        {recipe.category && (
          <div style={{ position: "absolute", top: 7, left: 7 }}>
            <Badge category={recipe.category} />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-2 gap-1">
        <h2
          className="line-clamp-2 leading-snug"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--fg-1)",
          }}
        >
          {recipe.title}
        </h2>
        {recipe.servings && (
          <p
            className="text-[11px] mt-auto"
            style={{ color: "var(--fg-2)" }}
          >
            🍽️ {recipe.servings} {t("servings")}
          </p>
        )}
      </div>
    </div>
  );
}
