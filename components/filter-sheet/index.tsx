import { Check } from "lucide-react";
import {
  type StatusFilter,
  type StatusFilterKey,
  toggleStatus,
} from "@/components/status-chips";
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
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
];

const STATUS_OPTIONS: {
  value: StatusFilterKey;
  label: string;
  color?: string;
}[] = [
  { value: "all", label: "All" },
  { value: "tried", label: "Tried ✓" },
  { value: "cancook", label: "Can Cook 🟢" },
  { value: "nearly", label: "Nearly 🟡" },
];

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 99,
    border: `1px solid ${active ? "rgba(251,191,36,0.6)" : "rgba(255,200,100,0.18)"}`,
    background: active ? "rgba(251,191,36,0.18)" : "transparent",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    fontWeight: active ? 600 : 500,
    color: active ? "var(--fg-1)" : "var(--fg-2)",
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
        marginBottom: 12,
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
  function handleReset() {
    onSortChange("newest");
    onCategoryChange(null);
    onStatusChange(["all"]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        showCloseButton={false}
        className="rounded-t-2xl z-[300]"
        style={{
          borderTop: "1px solid rgba(251,191,36,0.28)",
          borderLeft: "1px solid rgba(251,191,36,0.28)",
          borderRight: "1px solid rgba(251,191,36,0.28)",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 10,
            paddingBottom: 2,
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 99,
              background: "rgba(255,200,100,0.28)",
            }}
          />
        </div>
        <SheetHeader className="flex-row items-center justify-between mb-2">
          <SheetTitle style={{ fontSize: 20, fontWeight: 700 }}>
            Filters
          </SheetTitle>
          <button
            type="button"
            onClick={handleReset}
            style={{
              fontSize: 15,
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              color: "var(--fg-2)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            Reset
          </button>
        </SheetHeader>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            paddingLeft: 16,
            paddingRight: 16,
          }}
        >
          {/* Category */}
          <div>
            <SectionLabel>Category</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onCategoryChange(null)}
                style={chipStyle(category === null)}
              >
                All
              </button>
              {RECIPE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() =>
                    onCategoryChange(category === cat ? null : cat)
                  }
                  style={chipStyle(category === cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <SectionLabel>Status</SectionLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStatusChange(toggleStatus(status, value))}
                  style={chipStyle(status.includes(value))}
                >
                  {label}
                </button>
              ))}
            </div>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 11,
                color: "var(--fg-3)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Can Cook = all ingredients in pantry. Nearly = missing 1–2.
            </p>
          </div>

          {/* Sort by — list style */}
          <div>
            <SectionLabel>Sort by</SectionLabel>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,200,100,0.14)",
                overflow: "hidden",
              }}
            >
              {SORT_OPTIONS.map(({ value, label }, i) => {
                const isActive = sort === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSortChange(value)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      background: "transparent",
                      border: "none",
                      borderTop:
                        i > 0 ? "1px solid rgba(255,200,100,0.1)" : "none",
                      fontFamily: "var(--font-sans)",
                      fontSize: 15,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--fg-1)" : "var(--fg-2)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {label}
                    {isActive && (
                      <Check
                        size={16}
                        style={{ color: "rgba(251,191,36,0.9)", flexShrink: 0 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
