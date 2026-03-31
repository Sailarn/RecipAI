import { useTranslations } from "next-intl";
import type { SortOption } from "@/hooks/use-recipe-filter";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui";

interface RecipeFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  category: string | null;
  onCategoryChange: (value: string | null) => void;
}

export function RecipeFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  category,
  onCategoryChange,
}: RecipeFilterBarProps) {
  const t = useTranslations("recipes");

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex gap-2">
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="flex-1"
        />
        <Select
          value={sort}
          onValueChange={(v) => onSortChange(v as SortOption)}
        >
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

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            category === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("all")}
        </button>
        {RECIPE_CATEGORIES.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => onCategoryChange(category === cat ? null : cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              category === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
