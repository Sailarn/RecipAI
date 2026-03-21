"use client";

import { useTranslations } from "next-intl";
import { RecipeForm } from "@/components/recipe-form";

export default function NewRecipePage() {
  const t = useTranslations("recipeForm");

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t("createTitle")}</h1>
      <RecipeForm />
    </div>
  );
}
