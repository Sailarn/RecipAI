"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveState } from "./use-recipe-save";
import { TAB_KEYS } from "./use-tab-navigation";

interface FormActionBarProps {
  activeTabIndex: number;
  saveState: SaveState;
  isEditMode: boolean;
  backLabel: string;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}

export function FormActionBar({
  activeTabIndex,
  saveState,
  isEditMode,
  backLabel,
  nextLabel,
  onBack,
  onNext,
  onSave,
}: FormActionBarProps) {
  const isLastTab = activeTabIndex === TAB_KEYS.length - 1;

  return (
    <div
      className="shrink-0 pt-3 px-4 bg-[rgba(8,8,8,0.85)] backdrop-blur-[24px] border-t border-t-[rgba(255,200,100,0.12)] flex items-center"
      style={{
        paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
      }}
    >
      <div className="flex gap-[10px] w-full">
        {activeTabIndex > 0 && (
          <button
            type="button"
            onClick={onBack}
            disabled={saveState === "saving"}
            className={cn(
              "flex-1 p-[13px] rounded-[16px] border border-[rgba(255,200,100,0.20)] bg-[rgba(255,170,50,0.08)] text-[var(--fg-1)] text-[14px] font-semibold font-[family-name:var(--font-sans)] leading-none cursor-pointer transition-all duration-150 ease",
              saveState === "saving" && "opacity-50",
            )}
          >
            {backLabel}
          </button>
        )}

        {!isLastTab ? (
          <button
            type="button"
            onClick={onNext}
            className={cn(
              "py-[13px] px-8 rounded-[16px] max-h-[43px] border-0 w-full bg-[var(--action-primary)] text-white text-[14px] font-bold font-[family-name:var(--font-sans)] leading-none shadow-[0_4px_18px_rgba(59,130,246,0.45)] cursor-pointer transition-all duration-150 ease flex items-center justify-center gap-[6px]",
              activeTabIndex === 0 ? "flex-initial" : "flex-[2]",
            )}
          >
            {nextLabel}
            <ChevronRight
              width={14}
              height={14}
              strokeWidth={2}
              className="shrink-0"
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saving"}
            className={cn(
              "py-[13px] px-8 rounded-[16px] max-h-[43px] border-0 w-full text-white text-[14px] font-bold font-[family-name:var(--font-sans)] leading-none cursor-pointer transition-all duration-300 ease flex items-center justify-center gap-[6px]",
              activeTabIndex === 0 ? "flex-initial" : "flex-[2]",
              saveState === "saving" && "opacity-60 cursor-not-allowed",
              saveState === "saved"
                ? "bg-[rgba(74,222,128,0.70)] shadow-[0_4px_18px_rgba(74,222,128,0.45)]"
                : "bg-[var(--action-primary)] shadow-[0_4px_18px_rgba(59,130,246,0.45)]",
            )}
          >
            {saveState === "saved"
              ? "✓ Saved!"
              : saveState === "saving"
                ? "Saving..."
                : isEditMode
                  ? "Save"
                  : "Create"}
          </button>
        )}
      </div>
    </div>
  );
}
