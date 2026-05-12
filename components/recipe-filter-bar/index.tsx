import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StatusFilter } from "@/components/status-chips";
import { StatusChips } from "@/components/status-chips";
import type { SortOption } from "@/hooks/use-recipe-filter";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui";

interface RecipeFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  category: string | null;
  onCategoryChange: (value: string | null) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
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
}: RecipeFilterBarProps) {
  const t = useTranslations("recipes");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        marginBottom: 14,
      }}
    >
      {/* Search row */}
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
            placeholder={t("searchPlaceholder")}
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
        <Select
          value={sort}
          onValueChange={(v) => onSortChange(v as SortOption)}
        >
          <SelectTrigger className="w-36 !h-[38px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="oldest">{t("sortOldest")}</SelectItem>
            <SelectItem value="az">{t("sortAZ")}</SelectItem>
            <SelectItem value="za">{t("sortZA")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[null, ...RECIPE_CATEGORIES].map((cat) => {
          const isActive = category === cat;
          return (
            <button
              type="button"
              key={cat ?? "__all__"}
              onClick={() => onCategoryChange(cat)}
              className="shrink-0 transition-all"
              style={{
                padding: "5px 12px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: isActive ? 600 : 500,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                border: `1px solid ${isActive ? "rgba(255,210,120,0.50)" : "rgba(255,200,100,0.12)"}`,
                background: isActive ? "rgba(255,160,40,0.18)" : "transparent",
                color: isActive ? "var(--fg-1)" : "var(--fg-3)",
                backdropFilter: isActive ? "blur(12px)" : undefined,
                WebkitBackdropFilter: isActive ? "blur(12px)" : undefined,
              }}
            >
              {cat ?? t("all")}
            </button>
          );
        })}
      </div>
      <StatusChips active={status} onChange={onStatusChange} />
    </div>
  );
}
