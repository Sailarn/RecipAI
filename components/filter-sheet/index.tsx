import type { StatusFilter } from "@/components/status-chips";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui";
import type { SortOption } from "@/hooks/use-recipe-filter";
import { RECIPE_CATEGORIES } from "@/lib/categories";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  category: string | null;
  onCategoryChange: (v: string | null) => void;
  status: StatusFilter;
  onStatusChange: (v: StatusFilter) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tried", label: "Tried ✓" },
  { value: "want", label: "Want to try" },
];

function chipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 99,
    border: `1px solid ${active ? color : "rgba(255,200,100,0.12)"}`,
    background: active ? `${color}28` : "transparent",
    fontSize: 12,
    fontFamily: "var(--font-sans)",
    fontWeight: active ? 600 : 500,
    color: active ? "var(--fg-1)" : "var(--fg-3)",
    cursor: "pointer",
    flexShrink: 0,
    transition: "all 0.15s ease",
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--fg-3)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  sort,
  onSortChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
}: FilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-2xl pb-10"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            paddingLeft: 4,
            paddingRight: 4,
          }}
        >
          <div>
            <SectionLabel>Sort by</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSortChange(value)}
                  style={chipStyle(sort === value, "rgba(251,191,36,1)")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Category</SectionLabel>
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                scrollbarWidth: "none",
                marginLeft: -4,
                paddingLeft: 4,
              }}
            >
              {RECIPE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    onCategoryChange(category === cat ? null : cat)
                  }
                  style={chipStyle(category === cat, "rgba(139,92,246,1)")}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Status</SectionLabel>
            <div style={{ display: "flex", gap: 8 }}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusChange(value)}
                  style={chipStyle(status === value, "rgba(251,191,36,1)")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
