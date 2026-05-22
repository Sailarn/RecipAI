"use client";

import { useTranslations } from "next-intl";

export function RecipeEmptyState() {
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
    </div>
  );
}
