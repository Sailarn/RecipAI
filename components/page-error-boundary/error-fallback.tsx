"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("common");

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[var(--bg-base)] px-6 text-center">
      <TriangleAlert
        aria-hidden
        className="size-10 text-[var(--fg-3)]"
        strokeWidth={1.5}
      />
      <h1 className="font-heading text-xl font-extrabold text-[var(--fg-1)]">
        {t("error")}
      </h1>
      <p className="max-w-xs text-sm text-[var(--fg-2)]">{t("errorBody")}</p>
      <Button variant="outline" onClick={onRetry}>
        {t("tryAgain")}
      </Button>
    </div>
  );
}
