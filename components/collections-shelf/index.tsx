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

const TAB_BASE_CLASS =
  "py-2 px-3 border-b-2 bg-transparent cursor-pointer text-[13px] font-sans whitespace-nowrap shrink-0 transition-[color,border-color] duration-150";

function tabClass(active: boolean): string {
  const stateClass = active
    ? "border-b-[var(--food-accent)] font-semibold text-[var(--fg-1)]"
    : "border-b-transparent font-medium text-[var(--fg-3)]";
  return `${TAB_BASE_CLASS} ${stateClass}`;
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
      data-active={active}
      onClick={handleClick}
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerLeave={longPressHandlers.onPointerLeave}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onPointerMove={longPressHandlers.onPointerMove}
      onContextMenu={longPressHandlers.onContextMenu}
      className={tabClass(active)}
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
    <div className="flex overflow-x-auto [scrollbar-width:none] -mx-[14px] pl-[14px]">
      <button
        type="button"
        data-active={activeId === null}
        onClick={() => onSelect(null)}
        className={tabClass(activeId === null)}
      >
        🍴 All
      </button>

      {collections.map((collection) => (
        <CollectionTab
          key={collection.id}
          collection={collection}
          active={activeId === collection.id}
          onSelect={() => onSelect(collection.id)}
          onLongPress={onLongPress}
        />
      ))}

      <button
        type="button"
        aria-label="+"
        onClick={onCreateNew}
        className="py-2 px-3 border-b-2 border-b-transparent bg-transparent text-[var(--fg-3)] text-base cursor-pointer shrink-0"
      >
        +
      </button>

      <div className="min-w-[14px] shrink-0" />
    </div>
  );
}
