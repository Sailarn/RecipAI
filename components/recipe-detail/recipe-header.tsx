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

const glassPillStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.38)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: "99px",
  color: "rgba(255,255,255,0.90)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};

export function RecipeHeader({
  locale,
  recipeId,
  onDeleteClick,
}: RecipeHeaderProps) {
  const t = useTranslations("common");
  const tRecipes = useTranslations("recipes");
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: "relative",
        zIndex: 20,
        flexShrink: 0,
        padding: "56px 14px 8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <button
        type="button"
        onClick={() => navigate.back()}
        style={{
          ...glassPillStyle,
          padding: "7px 14px 7px 10px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}
      >
        <ChevronLeft size={13} color="rgba(255,255,255,0.75)" />
        {tRecipes("backToRecipes")}
      </button>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() =>
            navigate.push(
              routes.recipes.edit(locale, recipeId),
              <RecipeEditView recipeId={recipeId} />,
            )
          }
          style={{
            ...glassPillStyle,
            padding: "7px 16px",
          }}
        >
          {t("edit")}
        </button>
        <button
          type="button"
          onClick={onDeleteClick}
          aria-label="Delete"
          style={{
            ...glassPillStyle,
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
