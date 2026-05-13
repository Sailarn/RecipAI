"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Collection } from "@/lib/db/schema";

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "flex-end",
        touchAction: "none",
      }}
    >
      <button
        type="button"
        data-testid="sheet-backdrop"
        aria-label="Close"
        onClick={handleClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      />

      <div
        data-testid="sheet-panel"
        onAnimationEnd={() => {
          if (isClosing) onClose();
        }}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          background: "rgba(18,14,8,0.92)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,200,100,0.18)",
          borderRadius: "28px 28px 0 0",
          paddingTop: "20px",
          paddingLeft: "18px",
          paddingRight: "18px",
          paddingBottom: "max(36px, calc(env(safe-area-inset-bottom) + 20px))",
          boxShadow:
            "0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,130,0.12)",
          animation: isClosing
            ? "sheetSlideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,200,100,0.25)",
            margin: "0 auto 18px",
          }}
        />

        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--fg-1)",
            fontFamily: "var(--font-display)",
            marginBottom: 14,
          }}
        >
          Add to collection
        </div>

        {collections.map((c) => {
          const inCollection = currentCollectionIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                minHeight: 48,
                padding: "0 14px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid rgba(255,200,100,0.08)",
                cursor: "pointer",
                color: "var(--fg-1)",
                fontSize: 14,
                fontFamily: "var(--font-sans)",
              }}
            >
              <span>
                {c.emoji} {c.name}
              </span>
              <span
                style={{
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {inCollection && (
                  <svg
                    data-testid={`check-${c.id}`}
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="9" r="9" fill="rgba(34,197,94,0.85)" />
                    <path
                      d="M5 9l3 3 5-5"
                      stroke="#fff"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </button>
          );
        })}

        {collections.length === 0 && (
          <p
            style={{
              color: "var(--fg-3)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            No collections yet. Create one from the recipe list.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
