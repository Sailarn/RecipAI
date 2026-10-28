"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface ParseBackgroundBannerProps {
  locale: string;
  onReset: () => void;
}

export function ParseBackgroundBanner({
  locale,
  onReset,
}: ParseBackgroundBannerProps) {
  const t = useTranslations("parse");
  const navigate = useNavigate();

  return (
    <div className="mt-4 p-4 rounded-2xl text-center space-y-3 bg-[var(--glass-subtle-bg)] [backdrop-filter:var(--glass-subtle-blur)] [-webkit-backdrop-filter:var(--glass-subtle-blur)] border border-[var(--glass-subtle-border)]">
      <p className="[font:var(--type-body-sm)] text-[var(--fg-1)]">
        {t("background.title")}
      </p>
      <p className="[font:var(--type-caption)] text-[var(--fg-2)]">
        {t("background.hint")}
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onReset}>
          {t("parseAnother")}
        </Button>
        <Button
          size="sm"
          onClick={() => navigate.push(routes.recipes.list(locale))}
        >
          {t("background.goToRecipes")}
        </Button>
      </div>
    </div>
  );
}
