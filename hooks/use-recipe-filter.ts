import { useMemo, useState } from "react";
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

  const filtered = useMemo(() => {
    let result = [...recipes];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query),
      );
    }

    if (category) {
      result = result.filter((r) => r.category === category);
    }

    if (!status.includes("all")) {
      result = result.filter((r) =>
        status.some((s) => {
          if (s === "tried") return r.status === "tried";
          if (s === "cancook") return getMissing?.(r)?.missing === 0;
          if (s === "nearly") {
            const m = getMissing?.(r)?.missing;
            return m === 1 || m === 2;
          }
          return false;
        }),
      );
    }

    if (collectionId) {
      result = result.filter((r) => r.collectionIds?.includes(collectionId));
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
  }, [recipes, search, sort, category, status, collectionId, getMissing]);

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
