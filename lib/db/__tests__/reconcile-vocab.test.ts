import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockClear,
  mockPrimaryKeys,
  mockToArray,
  mockPullVocab,
  mockNormalize,
} = vi.hoisted(() => ({
  mockClear: vi.fn(),
  mockPrimaryKeys: vi.fn(),
  mockToArray: vi.fn(),
  mockPullVocab: vi.fn(),
  mockNormalize: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    ingredients: {
      clear: mockClear,
      toCollection: () => ({ primaryKeys: mockPrimaryKeys }),
    },
    recipes: { toArray: mockToArray },
  },
}));

vi.mock("../sync-vocab", () => ({
  pullVocab: mockPullVocab,
}));

vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: mockNormalize,
}));

import { reconcileVocab } from "../reconcile-vocab";

const RECONCILE_KEY = "vocabReconciled_v2";
const WATERMARK_KEY = "ingredientsSyncedAt";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockClear.mockResolvedValue(undefined);
  mockPullVocab.mockResolvedValue(undefined);
  mockPrimaryKeys.mockResolvedValue(["salt", "flour", "garlic"]);
  mockNormalize.mockResolvedValue({ matched: 1, total: 1 });
});

describe("reconcileVocab", () => {
  describe("first run", () => {
    it("clears ingredients, resets the watermark and re-pulls vocab", async () => {
      localStorage.setItem(WATERMARK_KEY, "2024-01-01T00:00:00.000Z");
      mockToArray.mockResolvedValue([]);

      await reconcileVocab();

      expect(mockClear).toHaveBeenCalledOnce();
      expect(localStorage.getItem(WATERMARK_KEY)).toBeNull();
      expect(mockPullVocab).toHaveBeenCalledOnce();
      expect(localStorage.getItem(RECONCILE_KEY)).toBe("1");
    });

    it("normalizes only recipes that reference an id missing from the vocab", async () => {
      mockToArray.mockResolvedValue([
        {
          id: "stale",
          ingredients: [{ item: "salt" }, { item: "parmigiano" }],
          canonicalIngredientIds: ["salt", "merged-away"],
        },
        {
          id: "fresh",
          ingredients: [{ item: "garlic" }, { item: "to taste" }],
          canonicalIngredientIds: ["garlic", ""],
        },
        { id: "unresolved", ingredients: [{ item: "flour" }] },
      ]);

      await reconcileVocab();

      expect(mockNormalize).toHaveBeenCalledOnce();
      expect(mockNormalize).toHaveBeenCalledWith("stale", [
        { item: "salt" },
        { item: "parmigiano" },
      ]);
    });
  });

  describe("failed vocab pull", () => {
    it("leaves the guard unset and normalizes nothing", async () => {
      mockPrimaryKeys.mockResolvedValue([]);
      mockToArray.mockResolvedValue([
        { id: "r1", ingredients: [], canonicalIngredientIds: ["salt"] },
      ]);

      await expect(reconcileVocab()).rejects.toThrow();

      expect(mockNormalize).not.toHaveBeenCalled();
      expect(localStorage.getItem(RECONCILE_KEY)).toBeNull();
    });
  });

  describe("already reconciled", () => {
    it("skips everything when the guard flag is set", async () => {
      localStorage.setItem(RECONCILE_KEY, "1");
      mockToArray.mockResolvedValue([{ id: "r1", ingredients: [] }]);

      await reconcileVocab();

      expect(mockClear).not.toHaveBeenCalled();
      expect(mockPullVocab).not.toHaveBeenCalled();
      expect(mockNormalize).not.toHaveBeenCalled();
    });
  });
});
