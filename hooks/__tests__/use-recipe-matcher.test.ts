import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-live-query-transition", () => ({
  useLiveQueryTransition: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({ db: { pantry: { toArray: vi.fn() } } }));

import { useLiveQueryTransition } from "@/hooks/use-live-query-transition";
import type { PantryItem, Recipe } from "@/lib/db/schema";
import { useRecipeMatcher } from "../use-recipe-matcher";

const makeRecipe = (
  canonicalIngredientIds: string[] | undefined,
): Pick<Recipe, "canonicalIngredientIds"> => ({ canonicalIngredientIds });

const makePantryItem = (
  id: string,
  ingredientId: string | undefined,
  on: boolean,
): PantryItem => ({
  id,
  ingredientId,
  name: "Test",
  qty: 1,
  unit: "pcs",
  cat: "Other",
  on,
  addedAt: new Date(),
});

describe("useRecipeMatcher", () => {
  it("returns null when recipe has no canonicalIngredientIds", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(
      result.current.getMissing(makeRecipe(undefined) as Recipe),
    ).toBeNull();
  });

  it("returns null when canonicalIngredientIds is empty array", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(result.current.getMissing(makeRecipe([]) as Recipe)).toBeNull();
  });

  it("returns missing:0 and total when all canonical ingredients are in pantry (on=true)", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([
      makePantryItem("p1", "ing-1", true),
      makePantryItem("p2", "ing-2", true),
    ]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(
      result.current.getMissing(makeRecipe(["ing-1", "ing-2"]) as Recipe),
    ).toEqual({ missing: 0, total: 2 });
  });

  it("returns missing count and total when some ingredients not in pantry", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([
      makePantryItem("p1", "ing-1", true),
    ]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(
      result.current.getMissing(
        makeRecipe(["ing-1", "ing-2", "ing-3"]) as Recipe,
      ),
    ).toEqual({ missing: 2, total: 3 });
  });

  it("does not count pantry items with on=false as available", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([
      makePantryItem("p1", "ing-1", false),
    ]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(result.current.getMissing(makeRecipe(["ing-1"]) as Recipe)).toEqual({
      missing: 1,
      total: 1,
    });
  });

  it("does not count pantry items without ingredientId", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([
      makePantryItem("p1", undefined, true),
    ]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(result.current.getMissing(makeRecipe(["ing-1"]) as Recipe)).toEqual({
      missing: 1,
      total: 1,
    });
  });

  it("returns correct count when pantry is empty", () => {
    vi.mocked(useLiveQueryTransition).mockReturnValue([]);
    const { result } = renderHook(() => useRecipeMatcher());
    expect(
      result.current.getMissing(makeRecipe(["ing-1", "ing-2"]) as Recipe),
    ).toEqual({ missing: 2, total: 2 });
  });
});
