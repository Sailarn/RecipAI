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

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    border: "none",
    borderBottom: active
      ? "2px solid rgba(251,191,36,0.9)"
      : "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    color: active ? "var(--fg-1)" : "var(--fg-3)",
    fontFamily: "var(--font-sans)",
    transition: "color 0.15s ease, border-color 0.15s ease",
    flexShrink: 0,
    whiteSpace: "nowrap",
  };
}

function CollectionTab({
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

  // pos is provided by the hook but not needed here — collection tab doesn't show a
  // positioned menu, it delegates positioning to the parent via onLongPress callback
  const longPressHandlers = useLongPress((_pos) => handleLongPress());

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
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerLeave={longPressHandlers.onPointerLeave}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onPointerMove={longPressHandlers.onPointerMove}
      onContextMenu={longPressHandlers.onContextMenu}
      style={tabStyle(active)}
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
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        marginLeft: -14,
        marginRight: -14,
        paddingLeft: 14,
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        style={tabStyle(activeId === null)}
      >
        🍴 All
      </button>

      {collections.map((c) => (
        <CollectionTab
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
          padding: "8px 12px",
          border: "none",
          borderBottom: "2px solid transparent",
          background: "transparent",
          color: "var(--fg-3)",
          fontSize: 16,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        +
      </button>

      <div style={{ minWidth: 14, flexShrink: 0 }} />
    </div>
  );
}
