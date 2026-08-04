import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StatusFilter } from "@/components/status-chips";
import { useCategoryLabel } from "@/hooks/use-category-label";
import type { SortOption } from "@/hooks/use-recipe-filter";
import type { Collection } from "@/lib/db/schema";

interface CompactFilterBarProps {
  activeCollectionId: string | null;
  collections: Collection[];
  search: string;
  sort: SortOption;
  category: string | null;
  status: StatusFilter;
  onScrollTop: () => void;
}

// Design-system accent tokens, tinted per chip via color-mix below.
const CHIP_COLLECTION = "var(--food-accent)";
const CHIP_SEARCH = "var(--action-primary)";
const CHIP_FILTER = "var(--ai-accent)";

const SORT_LABEL_KEYS: Record<SortOption, string> = {
  newest: "sortNewestShort",
  oldest: "sortOldest",
  az: "sortAZ",
  za: "sortZA",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  all: "all",
  tried: "statusTried",
  cancook: "statusCanCookShort",
  nearly: "statusNearlyShort",
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="py-[3px] px-2.5 rounded-full text-xs font-semibold font-sans whitespace-nowrap border"
      style={{
        background: `color-mix(in oklch, ${color} 13%, transparent)`,
        color,
        borderColor: `color-mix(in oklch, ${color} 27%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

export function CompactFilterBar({
  activeCollectionId,
  collections,
  search,
  sort,
  category,
  status,
  onScrollTop,
}: CompactFilterBarProps) {
  const t = useTranslations("recipes");
  const categoryLabel = useCategoryLabel();
  const activeCollection = collections.find(
    (collection) => collection.id === activeCollectionId,
  );
  const collectionLabel = activeCollection
    ? `${activeCollection.emoji} ${activeCollection.name}`
    : "🍴 All";

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-[14px] pb-2.5 pt-[calc(env(safe-area-inset-top)+10px)] bg-[rgba(8,6,3,0.45)] backdrop-blur-[8px]">
      <button
        type="button"
        onClick={onScrollTop}
        className="w-full flex items-center gap-2 py-[7px] pl-3 pr-[7px] rounded-full border border-[rgba(255,200,100,0.22)] bg-[rgba(20,16,10,0.88)] backdrop-blur-[24px] backdrop-saturate-[1.8] cursor-pointer text-left overflow-x-auto [scrollbar-width:none]"
      >
        <Chip label={collectionLabel} color={CHIP_COLLECTION} />

        {search && (
          <span data-testid="search-chip">
            <Chip label={search} color={CHIP_SEARCH} />
          </span>
        )}

        {category && (
          <Chip label={categoryLabel(category)} color={CHIP_FILTER} />
        )}
        {!status.includes("all") &&
          status.map((statusValue) => (
            <Chip
              key={statusValue}
              label={
                statusValue in STATUS_LABEL_KEYS
                  ? t(STATUS_LABEL_KEYS[statusValue])
                  : statusValue
              }
              color={CHIP_FILTER}
            />
          ))}
        {sort !== "newest" && (
          <Chip label={t(SORT_LABEL_KEYS[sort])} color={CHIP_FILTER} />
        )}

        <div className="ml-auto shrink-0 w-[30px] h-[30px] rounded-full bg-[rgba(255,200,100,0.1)] border border-[rgba(255,200,100,0.18)] flex items-center justify-center">
          <ChevronUp
            size={14}
            aria-label="scroll to top"
            style={{ color: "var(--fg-2)" }}
          />
        </div>
      </button>
    </div>
  );
}
