import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockClear, mockToArray, mockPullVocab, mockNormalize } = vi.hoisted(
  () => ({
    mockClear: vi.fn(),
    mockToArray: vi.fn(),
    mockPullVocab: vi.fn(),
    mockNormalize: vi.fn(),
  }),
);

vi.mock("../db", () => ({
  db: {
    ingredients: { clear: mockClear },
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

const RECONCILE_KEY = "vocabReconciled_v1";
const WATERMARK_KEY = "ingredientsSyncedAt";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockClear.mockResolvedValue(undefined);
  mockPullVocab.mockResolvedValue(undefined);
  mockNormalize.mockResolvedValue({ matched: 1, total: 1 });
});

describe("reconcileVocab", () => {
  it("clears ingredients, resets watermark, pulls vocab, normalizes all recipes", async () => {
    localStorage.setItem(WATERMARK_KEY, "2024-01-01T00:00:00.000Z");
    mockToArray.mockResolvedValue([
      { id: "r1", ingredients: [{ item: "salt" }, { item: "flour" }] },
      { id: "r2", ingredients: [{ item: "garlic" }] },
    ]);

    await reconcileVocab();

    expect(mockClear).toHaveBeenCalledOnce();
    expect(localStorage.getItem(WATERMARK_KEY)).toBeNull();
    expect(mockPullVocab).toHaveBeenCalledOnce();
    expect(mockNormalize).toHaveBeenCalledTimes(2);
    expect(mockNormalize).toHaveBeenCalledWith("r1", [
      { item: "salt" },
      { item: "flour" },
    ]);
    expect(mockNormalize).toHaveBeenCalledWith("r2", [{ item: "garlic" }]);
    expect(localStorage.getItem(RECONCILE_KEY)).toBe("1");
  });

  it("skips everything when the guard flag is already set", async () => {
    localStorage.setItem(RECONCILE_KEY, "1");
    mockToArray.mockResolvedValue([{ id: "r1", ingredients: [] }]);

    await reconcileVocab();

    expect(mockClear).not.toHaveBeenCalled();
    expect(mockPullVocab).not.toHaveBeenCalled();
    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("does not normalize when there are no recipes", async () => {
    mockToArray.mockResolvedValue([]);

    await reconcileVocab();

    expect(mockNormalize).not.toHaveBeenCalled();
    expect(localStorage.getItem(RECONCILE_KEY)).toBe("1");
  });
});
