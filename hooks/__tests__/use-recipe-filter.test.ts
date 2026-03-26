import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import { useRecipeFilter } from "../use-recipe-filter";

const mockRecipes: Recipe[] = [
  {
    id: "1",
    title: "Borsch",
    description: "Classic Ukrainian soup",
    servings: 4,
    ingredients: [],
    instructions: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    title: "Apple Pie",
    description: "Sweet dessert",
    servings: 8,
    ingredients: [],
    instructions: [],
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "3",
    title: "Zucchini Pasta",
    description: "Light summer dish",
    servings: 2,
    ingredients: [],
    instructions: [],
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
];

describe("useRecipeFilter", () => {
  it("returns all recipes with no filters", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    expect(result.current.filtered).toHaveLength(3);
  });

  it("filters by title", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSearch("apple"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe("Apple Pie");
  });

  it("filters by description", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSearch("soup"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].title).toBe("Borsch");
  });

  it("search is case insensitive", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSearch("APPLE"));
    expect(result.current.filtered).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSearch("xyz123"));
    expect(result.current.filtered).toHaveLength(0);
  });

  it("sorts newest first by default", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    expect(result.current.filtered[0].title).toBe("Apple Pie");
    expect(result.current.filtered[2].title).toBe("Borsch");
  });

  it("sorts oldest first", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSort("oldest"));
    expect(result.current.filtered[0].title).toBe("Borsch");
    expect(result.current.filtered[2].title).toBe("Apple Pie");
  });

  it("sorts A to Z", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSort("az"));
    expect(result.current.filtered[0].title).toBe("Apple Pie");
    expect(result.current.filtered[2].title).toBe("Zucchini Pasta");
  });

  it("sorts Z to A", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => result.current.setSort("za"));
    expect(result.current.filtered[0].title).toBe("Zucchini Pasta");
    expect(result.current.filtered[2].title).toBe("Apple Pie");
  });

  it("combines search and sort", () => {
    const { result } = renderHook(() => useRecipeFilter(mockRecipes));
    act(() => {
      result.current.setSearch("a");
      result.current.setSort("az");
    });
    // matches "Apple Pie" and "Zucchini Pasta" (has 'a' in title)
    expect(result.current.filtered[0].title).toBe("Apple Pie");
  });
});
