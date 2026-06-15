import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockToArray, mockNormalize } = vi.hoisted(() => ({
  mockToArray: vi.fn(),
  mockNormalize: vi.fn(),
}));

vi.mock("../db", () => ({
  db: { recipes: { toArray: mockToArray } },
}));

vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: mockNormalize,
}));

import { renormalizeOutdatedRecipes } from "../renormalize-recipes";

const makeRecipe = (
  id: string,
  ingredients: string[],
  canonicalIngredientIds: string[] | undefined,
) => ({
  id,
  ingredients: ingredients.map((item) => ({ item })),
  canonicalIngredientIds,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockNormalize.mockResolvedValue({ matched: 0, total: 0 });
});

describe("renormalizeOutdatedRecipes", () => {
  it("re-normalizes a recipe whose canonicalIngredientIds length is shorter than its ingredients (compacted)", async () => {
    mockToArray.mockResolvedValue([
      makeRecipe("r1", ["flour", "to taste"], ["flour-id"]),
    ]);

    await renormalizeOutdatedRecipes();

    expect(mockNormalize).toHaveBeenCalledOnce();
    expect(mockNormalize).toHaveBeenCalledWith("r1", [
      { item: "flour" },
      { item: "to taste" },
    ]);
  });

  it("re-normalizes a recipe missing canonicalIngredientIds entirely", async () => {
    mockToArray.mockResolvedValue([makeRecipe("r2", ["egg"], undefined)]);

    await renormalizeOutdatedRecipes();

    expect(mockNormalize).toHaveBeenCalledWith("r2", [{ item: "egg" }]);
  });

  it("skips a recipe already aligned (array length equals ingredient count)", async () => {
    mockToArray.mockResolvedValue([
      makeRecipe("r3", ["flour", "to taste"], ["flour-id", ""]),
    ]);

    await renormalizeOutdatedRecipes();

    expect(mockNormalize).not.toHaveBeenCalled();
  });
});
