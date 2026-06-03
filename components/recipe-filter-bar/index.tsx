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

  const activeCollection = collections.find(
    (collection) => collection.id === activeCollectionId,
  );
  const searchPlaceholder = activeCollection
    ? `Search in ${activeCollection.name}...`
    : t("searchPlaceholder");

  const activeFilterCount = [
    category !== null,
    !status.includes("all"),
    sort !== "newest",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col mb-2">
      <CollectionsShelf
        collections={collections}
        activeId={activeCollectionId}
        onSelect={onCollectionChange}
        onCreateNew={onCreateCollection}
        onLongPress={onCollectionLongPress}
      />

      <div className="h-px bg-[rgba(255,200,100,0.12)] -mx-[14px] mb-[10px]" />

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[var(--fg-3)] pointer-events-none z-[1]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full font-[family-name:var(--font-sans)] bg-[rgba(255,170,50,0.07)] border border-[rgba(255,200,100,0.15)] backdrop-blur-[12px] rounded-[14px] py-[9px] pr-3 pl-8 text-[13px] text-[var(--fg-1)] outline-none transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="relative flex items-center gap-[6px] py-[9px] px-[11px] rounded-[14px] border border-[rgba(255,200,100,0.15)] bg-[rgba(255,170,50,0.07)] text-[var(--fg-2)] text-[13px] font-[family-name:var(--font-sans)] font-medium cursor-pointer shrink-0"
        >
          <SlidersHorizontal size={16} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--action-primary)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
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
