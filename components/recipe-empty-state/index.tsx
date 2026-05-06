"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RecipeNewView } from "@/components/recipe-new-view";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

export function RecipeEmptyState() {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();
  const t = useTranslations("recipes");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "40px 16px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "var(--fg-2)",
          lineHeight: 1.8,
        }}
      >
        {t("noRecipes")}
      </p>
      <p
        style={{
          fontSize: 11,
          color: "var(--fg-3)",
          marginTop: 4,
          marginBottom: 20,
        }}
      >
        {t("createFirst")}
      </p>
      <button
        type="button"
        onClick={() =>
          navigate.push(
            routes.recipes.new(locale),
            <RecipeNewView locale={locale} />,
          )
        }
        style={{
          background: "var(--action-primary)",
          color: "#fff",
          borderRadius: 14,
          padding: "10px 20px",
          border: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
        }}
      >
        + New Recipe
      </button>
    </div>
  );
}
