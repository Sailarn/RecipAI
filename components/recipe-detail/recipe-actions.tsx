"use client";

import { isSocialUrl } from "@/lib/video-url";

interface RecipeActionsProps {
  sourceUrl?: string;
  onStartCooking: () => void;
}

export function RecipeActions({
  sourceUrl,
  onStartCooking,
}: RecipeActionsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onStartCooking}
        className="w-full mb-2 p-[13px] rounded-[16px] bg-[var(--action-primary)] text-white font-sans text-[14px] font-bold cursor-pointer shadow-[0_4px_20px_color-mix(in_oklch,var(--action-primary)_45%,transparent)] tracking-[0.2px]"
      >
        Start Cooking
      </button>

      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mb-6 p-[13px] rounded-[14px] bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)] backdrop-blur-[12px] text-[var(--fg-1)] font-sans text-sm font-medium text-center"
        >
          {isSocialUrl(sourceUrl) ? "Open post" : "Source"}
        </a>
      )}
    </>
  );
}
