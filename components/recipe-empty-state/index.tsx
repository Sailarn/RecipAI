"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

export function RecipeEmptyState() {
  const params = useParams();
  const locale = params.locale as string;
  const navigate = useNavigate();
  const t = useTranslations("recipes");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <p className="text-lg mb-4" style={{ color: "var(--muted-foreground)" }}>
        {t("noRecipes")}
      </p>
      <Button onClick={() => navigate.push(routes.recipes.new(locale))}>
        {t("createFirst")}
      </Button>
    </div>
  );
}
