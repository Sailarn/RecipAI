"use client";

import { ChevronLeft, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { RecipeEditView } from "@/components/recipe-edit-view";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface RecipeHeaderProps {
  locale: string;
  recipeId: string;
  onDeleteClick: () => void;
}

const glassPillClass =
  "bg-[rgba(0,0,0,0.38)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.15)] rounded-full text-[rgba(255,255,255,0.90)] text-[12px] font-medium cursor-pointer";

export function RecipeHeader({
  locale,
  recipeId,
  onDeleteClick,
}: RecipeHeaderProps) {
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");
  const navigate = useNavigate();

  return (
    <div className="relative z-[20] shrink-0 pt-[56px] px-[14px] pb-2 flex justify-between items-center">
      <button
        type="button"
        onClick={() => navigate.back()}
        className={`${glassPillClass} py-[7px] pr-[14px] pl-[10px] flex items-center gap-1`}
      >
        <ChevronLeft size={13} className="text-[rgba(255,255,255,0.75)]" />
        {tRecipes("backToRecipes")}
      </button>
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() =>
            navigate.push(
              routes.recipes.edit(locale, recipeId),
              <RecipeEditView recipeId={recipeId} />,
            )
          }
          className={`${glassPillClass} py-[7px] px-4`}
        >
          {t("edit")}
        </button>
        <button
          type="button"
          onClick={onDeleteClick}
          aria-label="Delete"
          className={`${glassPillClass} py-[7px] px-[10px] flex items-center justify-center`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
