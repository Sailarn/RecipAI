import { useDeferredValue, useMemo, useState } from "react";
import type { StatusFilter } from "@/components/status-chips";
import type { Recipe } from "@/lib/db/schema";

export type SortOption = "newest" | "oldest" | "az" | "za";

export function useRecipeFilter(
  recipes: Recipe[],
  getMissing?: (recipe: Recipe) => { missing: number; total: number } | null,
) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>(["all"]);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  // Filtering + sorting the whole library on every keystroke re-rendered the
  // page, the filter bar and the virtualiser synchronously, so typing felt
  // heavy on a large library. Deferring the query keeps the input itself at
  // interactive priority and lets React drop intermediate result sets.
  const deferredSearch = useDeferredValue(search);

  const filtered = useMemo(() => {
    let result = [...recipes];

    if (deferredSearch.trim()) {
      const query = deferredSearch.toLowerCase();
      result = result.filter(
        (recipe) =>
          recipe.title.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query),
      );
    }

    if (category) {
      result = result.filter((recipe) => recipe.category === category);
    }

    if (!status.includes("all")) {
      result = result.filter((recipe) =>
        status.some((statusKey) => {
          if (statusKey === "tried") return recipe.status === "tried";
          if (statusKey === "cancook")
            return getMissing?.(recipe)?.missing === 0;
          if (statusKey === "nearly") {
            const match = getMissing?.(recipe);
            if (!match) return false;
            // "Half+" — have at least half the ingredients but not all
            return match.missing > 0 && match.missing * 2 <= match.total;
          }
          return false;
        }),
      );
    }

    if (collectionId) {
      result = result.filter((recipe) =>
        recipe.collectionIds?.includes(collectionId),
      );
    }

    result.sort((a, b) => {
      switch (sort) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "az":
          return a.title.localeCompare(b.title);
        case "za":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [
    recipes,
    deferredSearch,
    sort,
    category,
    status,
    collectionId,
    getMissing,
  ]);

  return {
    search,
    setSearch,
    sort,
    setSort,
    category,
    setCategory,
    status,
    setStatus,
    collectionId,
    setCollectionId,
    filtered,
  };
}
