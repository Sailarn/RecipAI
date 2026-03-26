import { useMemo, useState } from "react";
import type { Recipe } from "@/lib/db/schema";

export type SortOption = "newest" | "oldest" | "az" | "za";

export function useRecipeFilter(recipes: Recipe[]) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

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
  }, [recipes, search, sort]);

  return { search, setSearch, sort, setSort, filtered };
}
