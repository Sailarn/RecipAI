import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFilterToArray, mockNormalize } = vi.hoisted(() => ({
  mockFilterToArray: vi.fn(),
  mockNormalize: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    recipes: {
      filter: (predicate: (recipe: unknown) => boolean) => ({
        toArray: async () =>
          ((await mockFilterToArray()) as unknown[]).filter(predicate),
      }),
    },
  },
}));
vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: mockNormalize,
}));

import { normalizePendingRecipes } from "../normalize-pending-recipes";

beforeEach(() => {
  vi.clearAllMocks();
  mockFilterToArray.mockResolvedValue([
    { id: "pending", ingredients: [{ item: "salt", qty: 1 }] },
    {
      id: "done",
      ingredients: [{ item: "salt" }],
      canonicalIngredientIds: ["salt"],
    },
    { id: "empty", ingredients: [] },
    { id: "pending-2", ingredients: [{ item: "flour" }] },
  ]);
});

describe("normalizePendingRecipes", () => {
  it("normalizes only recipes with ingredients and no canonical ids", async () => {
    mockNormalize.mockResolvedValue({ matched: 1, total: 1 });

    await normalizePendingRecipes();

    expect(mockNormalize.mock.calls).toEqual([
      ["pending", [{ item: "salt" }]],
      ["pending-2", [{ item: "flour" }]],
    ]);
  });

  it("runs one recipe at a time", async () => {
    let active = 0;
    let maxActive = 0;
    mockNormalize.mockImplementation(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
    });

    await normalizePendingRecipes();

    expect(maxActive).toBe(1);
  });

  it("keeps going after a recipe fails", async () => {
    mockNormalize
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ matched: 1, total: 1 });

    await expect(normalizePendingRecipes()).resolves.toBeUndefined();

    expect(mockNormalize).toHaveBeenCalledTimes(2);
  });
});
