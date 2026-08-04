"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface RecipeCardContextMenuProps {
  status: "tried" | null;
  position: { x: number; y: number };
  onClose: () => void;
  onToggleStatus: () => void;
  onAddToCollection: () => void;
  onDelete: () => void;
}

const VIEWPORT_CLAMP_WIDTH = 210;
const VIEWPORT_CLAMP_HEIGHT = 160;

const menuItemClass =
  "flex items-center gap-[10px] px-[14px] py-[11px] bg-transparent w-full text-left cursor-pointer text-[13px] font-medium font-sans border-b border-b-[rgba(255,200,100,0.10)] [transition:background_0.12s_ease]";

export function RecipeCardContextMenu({
  status,
  position,
  onClose,
  onToggleStatus,
  onAddToCollection,
  onDelete,
}: RecipeCardContextMenuProps) {
  const t = useTranslations("recipes");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const statusLabel = t(status === "tried" ? "markUntried" : "markTried");

  return createPortal(
    <>
      <button
        type="button"
        data-testid="ctx-backdrop"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
        className="fixed inset-0 z-[300] bg-transparent cursor-pointer p-0"
      />

      <div
        className="fixed z-[400] min-w-[190px] bg-[rgba(18,14,6,0.92)] border border-[rgba(255,200,100,0.20)] rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,220,130,0.10)] backdrop-blur-[28px] backdrop-saturate-200 overflow-hidden animate-[ctxIn_0.18s_cubic-bezier(0.34,1.56,0.64,1)]"
        style={{
          left: Math.min(position.x, window.innerWidth - VIEWPORT_CLAMP_WIDTH),
          top: Math.min(position.y, window.innerHeight - VIEWPORT_CLAMP_HEIGHT),
        }}
      >
        <button
          type="button"
          onClick={() => {
            onToggleStatus();
            onClose();
          }}
          className={cn(menuItemClass, "text-[var(--fg-1)]")}
        >
          {statusLabel}
        </button>

        <button
          type="button"
          onClick={() => {
            onAddToCollection();
            onClose();
          }}
          className={cn(menuItemClass, "text-[var(--fg-1)]")}
        >
          {t("addToCollection")}
        </button>

        <button
          type="button"
          onClick={() => {
            onDelete();
            onClose();
          }}
          className={cn(menuItemClass, "text-red-500 border-b-0")}
        >
          {t("deleteRecipe")}
        </button>
      </div>
    </>,
    document.body,
  );
}
