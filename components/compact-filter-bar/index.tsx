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
  oldest: "↓ Oldest first",
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
        position: "fixed",
        top: "calc(env(safe-area-inset-top) + 10px)",
        left: 14,
        right: 14,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 7px 7px 12px",
        background: "rgba(20, 16, 10, 0.88)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderRadius: 99,
        border: "1px solid rgba(255, 200, 100, 0.22)",
        cursor: "pointer",
        textAlign: "left",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
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

      <div
        style={{
          marginLeft: "auto",
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: 99,
          background: "rgba(255, 200, 100, 0.1)",
          border: "1px solid rgba(255, 200, 100, 0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ChevronUp
          size={14}
          aria-label="scroll to top"
          style={{ color: "var(--fg-2)" }}
        />
      </div>
    </button>
  );
}
