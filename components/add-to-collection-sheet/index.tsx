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

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <button
        type="button"
        data-testid="sheet-backdrop"
        onClick={onClose}
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
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          background: "rgba(18,14,8,0.92)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,200,100,0.18)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 18px 36px",
          boxShadow:
            "0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,130,0.12)",
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
                padding: "11px 14px",
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
              {inCollection && (
                <span
                  data-testid={`check-${c.id}`}
                  style={{ color: "#4ade80", fontSize: 16 }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {collections.length === 0 && (
          <p
            style={{ color: "var(--fg-3)", fontSize: 13, textAlign: "center" }}
          >
            No collections yet. Create one from the recipe list.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
