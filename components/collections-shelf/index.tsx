"use client";

import { useCallback, useRef } from "react";
import { useLongPress } from "@/hooks/use-long-press";
import type { Collection } from "@/lib/db/schema";

interface CollectionsShelfProps {
  collections: Collection[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreateNew: () => void;
  onLongPress?: (collection: Collection) => void;
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
      ? "inset 0 1px 0 rgba(255,230,150,0.20)"
      : "none",
    transform: "scale(1)",
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

function CollectionPill({
  collection,
  active,
  onSelect,
  onLongPress,
}: {
  collection: Collection;
  active: boolean;
  onSelect: () => void;
  onLongPress?: (collection: Collection) => void;
}) {
  const didLongPress = useRef(false);

  const handleLongPress = useCallback(() => {
    didLongPress.current = true;
    onLongPress?.(collection);
  }, [collection, onLongPress]);

  const longPressHandlers = useLongPress(handleLongPress);

  function handleClick() {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    onSelect();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseDown={longPressHandlers.onMouseDown}
      onMouseUp={longPressHandlers.onMouseUp}
      onMouseLeave={longPressHandlers.onMouseLeave}
      onTouchStart={longPressHandlers.onTouchStart}
      onTouchEnd={longPressHandlers.onTouchEnd}
      onTouchMove={longPressHandlers.onTouchMove}
      onContextMenu={longPressHandlers.onContextMenu}
      style={pillStyle(active)}
    >
      {collection.emoji} {collection.name}
    </button>
  );
}

export function CollectionsShelf({
  collections,
  activeId,
  onSelect,
  onCreateNew,
  onLongPress,
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
        marginLeft: -14,
        marginRight: -14,
        paddingLeft: 14,
        paddingBottom: 4,
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
        <CollectionPill
          key={c.id}
          collection={c}
          active={activeId === c.id}
          onSelect={() => onSelect(c.id)}
          onLongPress={onLongPress}
        />
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

      {/* Trailing spacer so the last pill has breathing room when scrolled to the end.
          paddingRight on overflow:auto flex containers is unreliable in Safari. */}
      <div style={{ minWidth: 14, flexShrink: 0 }} />
    </div>
  );
}
