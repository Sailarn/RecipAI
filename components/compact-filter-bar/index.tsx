import { ChevronUp } from "lucide-react";
import type { StatusFilter } from "@/components/status-chips";
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

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  az: "A → Z",
  za: "Z → A",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All",
  tried: "Tried ✓",
  want: "Want to try",
};

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        whiteSpace: "nowrap",
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
  const activeCollection = collections.find((c) => c.id === activeCollectionId);
  const collectionLabel = activeCollection
    ? `${activeCollection.emoji} ${activeCollection.name}`
    : "🍴 All";

  return (
    <button
      type="button"
      onClick={onScrollTop}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        background: "var(--glass-subtle-bg)",
        backdropFilter: "var(--glass-subtle-blur)",
        WebkitBackdropFilter: "var(--glass-subtle-blur)",
        borderBottom: "1px solid rgba(255,200,100,0.12)",
        cursor: "pointer",
        textAlign: "left",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      <ChevronUp
        size={14}
        aria-label="scroll to top"
        style={{ color: "var(--fg-3)", flexShrink: 0 }}
      />

      <Chip label={collectionLabel} color="rgba(251,191,36,1)" />

      {search && (
        <span data-testid="search-chip">
          <Chip label={search} color="rgba(96,165,250,1)" />
        </span>
      )}

      {category && <Chip label={category} color="rgba(167,139,250,1)" />}
      {status !== "all" && (
        <Chip label={STATUS_LABELS[status]} color="rgba(167,139,250,1)" />
      )}
      {sort !== "newest" && (
        <Chip label={SORT_LABELS[sort]} color="rgba(167,139,250,1)" />
      )}
    </button>
  );
}
