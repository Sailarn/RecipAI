"use client";

import { useTranslations } from "next-intl";
import { RecipeEditView } from "@/components/recipe-edit-view";
import { Button } from "@/components/ui";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeHeaderProps {
  locale: string;
  recipeId: string;
  onDeleteClick: () => void;
}

export function RecipeHeader({
  locale,
  recipeId,
  onDeleteClick,
}: RecipeHeaderProps) {
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        type="button"
        onClick={() => navigate.back()}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← {tRecipes("backToRecipes")}
      </button>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate.push(
              routes.recipes.edit(locale, recipeId),
              <RecipeEditView recipeId={recipeId} />,
            )
          }
        >
          {t("edit")}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDeleteClick}>
          {t("delete")}
        </Button>
      </div>
    </div>
  );
}
