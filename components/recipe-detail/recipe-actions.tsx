"use client";

import { isVideoUrl } from "@/lib/video-url";

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
        className="w-full mb-2 p-[13px] rounded-[16px] bg-[#3b82f6] text-white font-sans text-[14px] font-bold cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.45)] tracking-[0.2px]"
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
          {isVideoUrl(sourceUrl) ? "Watch video" : "Source"}
        </a>
      )}
    </>
  );
}
