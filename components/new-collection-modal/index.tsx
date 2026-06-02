"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { EmojiPicker } from "@/components/emoji-picker";

interface NewCollectionModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; emoji: string }) => void;
}

const NAME_INPUT_CLASS =
  "w-full py-[11px] px-[14px] rounded-[14px] bg-[rgba(255,170,50,0.08)] backdrop-blur-[12px] text-[var(--fg-1)] text-base font-sans outline-none mb-[14px] box-border transition-[border-color] duration-200 border";

const CANCEL_BUTTON_CLASS =
  "flex-1 p-[9px] bg-[rgba(255,170,50,0.06)] text-[var(--fg-2)] border border-[rgba(255,200,100,0.12)] rounded-xl text-[13px] font-medium font-sans cursor-pointer";

export function NewCollectionModal({
  onClose,
  onCreate,
}: NewCollectionModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");

  const canCreate = Boolean(name.trim());

  return (
    <BottomSheet
      title="New Collection"
      onClose={onClose}
      backdropTestId="modal-backdrop"
    >
      {(requestClose) => {
        function handleCreate() {
          if (!canCreate) return;
          onCreate({ name: name.trim(), emoji });
          requestClose();
        }

        return (
          <>
            <EmojiPicker selected={emoji} onSelect={setEmoji} />

            <input
              type="text"
              placeholder="Collection name…"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={`${NAME_INPUT_CLASS} ${
                name
                  ? "border-[rgba(255,200,100,0.30)]"
                  : "border-[rgba(255,200,100,0.15)]"
              }`}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={requestClose}
                className={CANCEL_BUTTON_CLASS}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate}
                className={`flex-[2] p-[13px] text-sm font-bold border-none rounded-2xl font-sans transition-all duration-200 ${
                  canCreate
                    ? "cursor-pointer bg-[var(--action-primary)] text-white shadow-[0_4px_20px_rgba(59,130,246,0.45)]"
                    : "cursor-default bg-[rgba(59,130,246,0.25)] text-white/35"
                }`}
              >
                Create
              </button>
            </div>
          </>
        );
      }}
    </BottomSheet>
  );
}
