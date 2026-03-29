"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="flex-1"
      />
      <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
        <SelectTrigger className="w-40 !h-11">
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
  );
}
