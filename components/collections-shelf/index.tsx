"use client";

import type { Collection } from "@/lib/db/schema";

interface CollectionsShelfProps {
  collections: Collection[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNew: () => void;
}

function pillStyle(active: boolean) {
  return {
    padding: "7px 13px",
    borderRadius: 99,
    border: active
      ? "1px solid rgba(255,210,120,0.50)"
      : "1px solid rgba(255,200,100,0.14)",
    background: active ? "rgba(255,180,60,0.20)" : "rgba(255,170,50,0.07)",
    boxShadow: active
      ? "0 0 14px rgba(251,191,36,0.22), inset 0 1px 0 rgba(255,230,150,0.18)"
      : "none",
    transform: active ? "scale(1.03)" : "scale(1)",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    color: active ? "var(--fg-1)" : "var(--fg-2)",
    fontFamily: "var(--font-sans)",
    transition: "all 0.18s ease",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    flexShrink: 0,
  } as React.CSSProperties;
}

export function CollectionsShelf({
  collections,
  activeId,
  onSelect,
  onCreateNew,
}: CollectionsShelfProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        style={pillStyle(activeId === null)}
      >
        🍴 All
      </button>

      {collections.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          style={pillStyle(activeId === c.id)}
        >
          {c.emoji} {c.name}
        </button>
      ))}

      <button
        type="button"
        aria-label="+"
        onClick={onCreateNew}
        style={{
          width: 34,
          height: 34,
          borderRadius: 99,
          border: "1px dashed rgba(255,200,100,0.22)",
          background: "rgba(255,170,50,0.07)",
          color: "var(--fg-3)",
          fontSize: 18,
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        +
      </button>
    </div>
  );
}
