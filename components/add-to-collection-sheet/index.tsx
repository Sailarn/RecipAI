"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Collection } from "@/lib/db/schema";
import { CollectionRow } from "./collection-row";

interface AddToCollectionSheetProps {
  collections: Collection[];
  currentCollectionIds: string[];
  onSelect: (collectionId: string) => void;
  onClose: () => void;
}

export function AddToCollectionSheet({
  collections,
  currentCollectionIds,
  onSelect,
  onClose,
}: AddToCollectionSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function handleClose() {
    if (isClosing) return;
    setIsClosing(true);
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end touch-none">
      <button
        type="button"
        data-testid="sheet-backdrop"
        aria-label="Close"
        onClick={handleClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[4px] border-none cursor-pointer p-0"
      />

      <div
        data-testid="sheet-panel"
        onAnimationEnd={() => {
          if (isClosing) onClose();
        }}
        className="relative z-[1] w-full bg-[rgba(18,14,8,0.92)] backdrop-blur-[32px] backdrop-saturate-200 border border-[rgba(255,200,100,0.18)] rounded-t-[28px] pt-5 px-[18px] pb-[max(36px,calc(env(safe-area-inset-bottom)+20px))] shadow-[0_-8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,220,130,0.12)]"
        style={{
          animation: isClosing
            ? "sheetSlideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="w-9 h-1 rounded-[2px] bg-[rgba(255,200,100,0.25)] mx-auto mb-[18px]" />

        <div className="text-[15px] font-bold text-[var(--fg-1)] font-heading mb-3.5">
          Add to collection
        </div>

        {collections.map((collection) => (
          <CollectionRow
            key={collection.id}
            collection={collection}
            inCollection={currentCollectionIds.includes(collection.id)}
            onSelect={onSelect}
          />
        ))}

        {collections.length === 0 && (
          <p className="text-[var(--fg-3)] text-[13px] text-center">
            No collections yet. Create one from the recipe list.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
