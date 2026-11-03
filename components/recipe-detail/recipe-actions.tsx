"use client";

import { useTranslations } from "next-intl";
import { AskAiButton } from "@/components/ask-ai";
import { isSocialUrl } from "@/lib/video-url";

interface RecipeActionsProps {
  sourceUrl?: string;
  onStartCooking: () => void;
  /** Shown only to signed-in users: AI apps reach recipes through the account. */
  askAi?: { recipeId: string; title: string };
}

export function RecipeActions({
  sourceUrl,
  onStartCooking,
  askAi,
}: RecipeActionsProps) {
  const t = useTranslations("recipes");
  const hasSecondaryRow = Boolean(sourceUrl || askAi);
  return (
    <>
      <button
        type="button"
        onClick={onStartCooking}
        className="w-full mb-2 p-[13px] rounded-[16px] bg-[var(--action-primary)] text-white font-sans text-[14px] font-bold cursor-pointer shadow-[0_4px_20px_color-mix(in_oklch,var(--action-primary)_45%,transparent)] tracking-[0.2px]"
      >
        {t("startCooking")}
      </button>

      {hasSecondaryRow && (
        <div className="mb-6 flex gap-2">
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block flex-1 min-w-0 truncate p-[13px] rounded-[14px] bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)] backdrop-blur-[12px] text-[var(--fg-1)] font-sans text-sm font-medium text-center"
            >
              {isSocialUrl(sourceUrl) ? t("openPost") : t("source")}
            </a>
          )}
          {askAi && (
            <AskAiButton recipeId={askAi.recipeId} title={askAi.title} />
          )}
        </div>
      )}
    </>
  );
}
