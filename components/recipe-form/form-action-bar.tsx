"use client";

import { ChevronRight } from "lucide-react";
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
      style={{
        flexShrink: 0,
        padding: "12px 16px",
        paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
        background: "rgba(8,8,8,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,200,100,0.12)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", gap: 10, width: "100%" }}>
        {activeTabIndex > 0 && (
          <button
            type="button"
            onClick={onBack}
            disabled={saveState === "saving"}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 16,
              border: "1px solid rgba(255,200,100,0.20)",
              background: "rgba(255,170,50,0.08)",
              color: "var(--fg-1)",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "var(--font-sans)",
              lineHeight: 1,
              cursor: "pointer",
              transition: "all 0.15s ease",
              opacity: saveState === "saving" ? 0.5 : 1,
            }}
          >
            {backLabel}
          </button>
        )}

        {!isLastTab ? (
          <button
            type="button"
            onClick={onNext}
            style={{
              flex: activeTabIndex === 0 ? "0 1 auto" : 2,
              padding: "13px 32px",
              borderRadius: 16,
              maxHeight: 43,
              border: "none",
              width: "100%",
              background: "var(--action-primary)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              lineHeight: 1,
              boxShadow: "0 4px 18px rgba(59,130,246,0.45)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {nextLabel}
            <ChevronRight
              width={14}
              height={14}
              strokeWidth={2}
              style={{ flexShrink: 0 }}
              aria-hidden="true"
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={saveState === "saving"}
            style={{
              flex: activeTabIndex === 0 ? "0 1 auto" : 2,
              padding: "13px 32px",
              borderRadius: 16,
              maxHeight: 43,
              border: "none",
              width: "100%",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              lineHeight: 1,
              cursor: saveState === "saving" ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              ...(saveState === "saved"
                ? {
                    background: "rgba(74,222,128,0.70)",
                    boxShadow: "0 4px 18px rgba(74,222,128,0.45)",
                    color: "#fff",
                  }
                : {
                    background: "var(--action-primary)",
                    boxShadow: "0 4px 18px rgba(59,130,246,0.45)",
                    color: "#fff",
                  }),
              opacity: saveState === "saving" ? 0.6 : 1,
            }}
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
