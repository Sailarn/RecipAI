"use client";

import { useTranslations } from "next-intl";
import type { SortOption } from "@/hooks/use-recipe-filter";

interface RecipeFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function RecipeFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: RecipeFilterBarProps) {
  const t = useTranslations("recipes");

  return (
    <div className="flex gap-2 mb-6">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="flex-1 rounded-lg px-3 py-2 text-sm transition-colors"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          color: "var(--foreground)",
        }}
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="rounded-lg px-3 py-2 text-sm"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          color: "var(--foreground)",
        }}
      >
        <option value="newest">{t("sortNewest")}</option>
        <option value="oldest">{t("sortOldest")}</option>
        <option value="az">{t("sortAZ")}</option>
        <option value="za">{t("sortZA")}</option>
      </select>
    </div>
  );
}
