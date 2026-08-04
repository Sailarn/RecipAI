import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  type StatusFilter,
  type StatusFilterKey,
  toggleStatus,
} from "@/components/status-chips";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui";
import { useCategoryLabel } from "@/hooks/use-category-label";
import type { SortOption } from "@/hooks/use-recipe-filter";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import { trackEvent } from "@/lib/telemetry";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
}

const SORT_OPTIONS: { value: SortOption; labelKey: string }[] = [
  { value: "newest", labelKey: "sortNewest" },
  { value: "oldest", labelKey: "sortOldest" },
  { value: "az", labelKey: "sortAZ" },
  { value: "za", labelKey: "sortZA" },
];

const STATUS_OPTIONS: { value: StatusFilterKey; labelKey: string }[] = [
  { value: "all", labelKey: "all" },
  { value: "tried", labelKey: "statusTried" },
  { value: "cancook", labelKey: "statusCanCook" },
  { value: "nearly", labelKey: "statusNearly" },
];

const CHIP_BASE_CLASS =
  "py-[7px] px-3.5 rounded-full border text-[13px] font-sans cursor-pointer shrink-0 transition-all duration-150";

function chipClass(active: boolean): string {
  return `${CHIP_BASE_CLASS} ${
    active
      ? "border-[rgba(251,191,36,0.6)] bg-[rgba(251,191,36,0.18)] font-semibold text-[var(--fg-1)]"
      : "border-[rgba(255,200,100,0.18)] bg-transparent font-medium text-[var(--fg-2)]"
  }`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-[var(--fg-3)] uppercase tracking-[0.08em] mb-3">
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
  const t = useTranslations("recipes");
  const categoryLabel = useCategoryLabel();
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
        className="rounded-t-2xl z-[300] border-t border-l border-r border-[rgba(251,191,36,0.28)] pb-6"
      >
        <div className="flex justify-center pt-2.5 pb-0.5">
          <div className="w-9 h-1 rounded-full bg-[rgba(255,200,100,0.28)]" />
        </div>
        <SheetHeader className="flex-row items-center justify-between mb-2">
          <SheetTitle className="text-xl font-bold">{t("filters")}</SheetTitle>
          <button
            type="button"
            onClick={handleReset}
            className="text-[15px] font-sans font-medium text-[var(--fg-2)] bg-transparent border-none cursor-pointer py-1"
          >
            {t("reset")}
          </button>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4">
          {/* Category */}
          <div>
            <SectionLabel>{t("category")}</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onCategoryChange(null)}
                className={chipClass(category === null)}
              >
                {t("all")}
              </button>
              {RECIPE_CATEGORIES.map((categoryOption) => (
                <button
                  key={categoryOption}
                  type="button"
                  onClick={() => {
                    onCategoryChange(
                      category === categoryOption ? null : categoryOption,
                    );
                    trackEvent("filter_applied", { kind: "category" });
                  }}
                  className={chipClass(category === categoryOption)}
                >
                  {categoryLabel(categoryOption)}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <SectionLabel>{t("status")}</SectionLabel>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(({ value, labelKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    onStatusChange(toggleStatus(status, value));
                    trackEvent("filter_applied", { kind: "status" });
                  }}
                  className={chipClass(status.includes(value))}
                >
                  {t(labelKey)}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11px] text-[var(--fg-3)] font-sans">
              {t("statusHint")}
            </p>
          </div>

          {/* Sort by — list style */}
          <div>
            <SectionLabel>{t("sortBy")}</SectionLabel>
            <div className="rounded-[14px] border border-[rgba(255,200,100,0.14)] overflow-hidden">
              {SORT_OPTIONS.map(({ value, labelKey }, index) => {
                const isActive = sort === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onSortChange(value);
                      trackEvent("filter_applied", { kind: "sort" });
                    }}
                    className={`w-full flex items-center justify-between py-3.5 px-4 bg-transparent font-sans text-[15px] cursor-pointer text-left ${
                      index > 0
                        ? "border-t border-t-[rgba(255,200,100,0.1)]"
                        : ""
                    } ${isActive ? "font-semibold text-[var(--fg-1)]" : "font-normal text-[var(--fg-2)]"}`}
                  >
                    {t(labelKey)}
                    {isActive && (
                      <Check
                        size={16}
                        className="shrink-0 text-[rgba(251,191,36,0.9)]"
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
