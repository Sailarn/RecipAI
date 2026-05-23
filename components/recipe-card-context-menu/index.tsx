"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface RecipeCardContextMenuProps {
  status: "tried" | null;
  pos: { x: number; y: number };
  onClose: () => void;
  onToggleStatus: () => void;
  onAddToCollection: () => void;
  onDelete: () => void;
}

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 14px",
  background: "transparent",
  border: "none",
  width: "100%",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "var(--font-sans)",
  borderBottom: "1px solid rgba(255,200,100,0.10)",
  transition: "background 0.12s ease",
};

export function RecipeCardContextMenu({
  status,
  pos,
  onClose,
  onToggleStatus,
  onAddToCollection,
  onDelete,
}: RecipeCardContextMenuProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const statusLabel = status === "tried" ? "Mark as untried" : "Mark as tried";

  return createPortal(
    <>
      <button
        type="button"
        data-testid="ctx-backdrop"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onClose();
          }
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 300,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: 0,
        }}
      />

      <div
        style={{
          position: "fixed",
          left: Math.min(pos.x, window.innerWidth - 210),
          top: Math.min(pos.y, window.innerHeight - 160),
          zIndex: 400,
          minWidth: 190,
          background: "rgba(18,14,6,0.92)",
          border: "1px solid rgba(255,200,100,0.20)",
          borderRadius: 18,
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,220,130,0.10)",
          backdropFilter: "blur(28px) saturate(200%)",
          WebkitBackdropFilter: "blur(28px) saturate(200%)",
          overflow: "hidden",
          animation: "ctxIn 0.18s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onToggleStatus();
            onClose();
          }}
          style={{ ...itemStyle, color: "var(--fg-1)" }}
        >
          {statusLabel}
        </button>

        <button
          type="button"
          onClick={() => {
            onAddToCollection();
            onClose();
          }}
          style={{ ...itemStyle, color: "var(--fg-1)" }}
        >
          Add to collection
        </button>

        <button
          type="button"
          onClick={() => {
            onDelete();
            onClose();
          }}
          style={{ ...itemStyle, color: "#ef4444", borderBottom: "none" }}
        >
          Delete recipe
        </button>
      </div>
    </>,
    document.body,
  );
}
