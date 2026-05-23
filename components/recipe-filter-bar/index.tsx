import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CollectionsShelf } from "@/components/collections-shelf";
import { FilterSheet } from "@/components/filter-sheet";
import type { StatusFilter } from "@/components/status-chips";
import type { SortOption } from "@/hooks/use-recipe-filter";
import type { Collection } from "@/lib/db/schema";

interface RecipeFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  category: string | null;
  onCategoryChange: (value: string | null) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
  collections: Collection[];
  activeCollectionId: string | null;
  onCollectionChange: (id: string | null) => void;
  onCreateCollection: () => void;
  onCollectionLongPress?: (collection: Collection) => void;
}

export function RecipeFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  collections,
  activeCollectionId,
  onCollectionChange,
  onCreateCollection,
  onCollectionLongPress,
}: RecipeFilterBarProps) {
  const t = useTranslations("recipes");
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const searchPlaceholder = activeCollection
    ? `Search in ${activeCollection.name}...`
    : t("searchPlaceholder");

  const activeFilterCount = [
    category !== null,
    !status.includes("all"),
    sort !== "newest",
  ].filter(Boolean).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 8 }}>
      <CollectionsShelf
        collections={collections}
        activeId={activeCollectionId}
        onSelect={onCollectionChange}
        onCreateNew={onCreateCollection}
        onLongPress={onCollectionLongPress}
      />

      <div
        style={{
          height: 1,
          background: "rgba(255,200,100,0.12)",
          marginLeft: -14,
          marginRight: -14,
          marginBottom: 10,
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            strokeWidth={2}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-3)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="transition-colors"
            style={{
              width: "100%",
              fontFamily: "var(--font-sans)",
              background: "rgba(255,170,50,0.07)",
              border: "1px solid rgba(255,200,100,0.15)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 14,
              padding: "9px 12px 9px 32px",
              fontSize: 13,
              color: "var(--fg-1)",
              outline: "none",
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 11px",
            borderRadius: 14,
            border: "1px solid rgba(255,200,100,0.15)",
            background: "rgba(255,170,50,0.07)",
            color: "var(--fg-2)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                background: "var(--action-primary)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 99,
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sort={sort}
        onSortChange={onSortChange}
        category={category}
        onCategoryChange={onCategoryChange}
        status={status}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}
