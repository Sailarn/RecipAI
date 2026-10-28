import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPut, mockNormalize } = vi.hoisted(() => ({
  mockPut: vi.fn(),
  mockNormalize: vi.fn(),
}));

vi.mock("../db", () => ({ db: { recipes: { put: mockPut } } }));
vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: mockNormalize,
}));

import { pullOwnRecipe } from "../pull-own-recipe";

const fetchMock = vi.fn();

function serverRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: "recipe-1",
    title: "Borscht",
    ingredients: [{ item: "beet" }],
    instructions: [],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  mockPut.mockResolvedValue(undefined);
  mockNormalize.mockResolvedValue({ matched: 1, total: 1 });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pullOwnRecipe", () => {
  it("caches the recipe with revived dates and a syncedAt marker", async () => {
    fetchMock.mockResolvedValue(Response.json({ recipe: serverRecipe() }));

    const recipe = await pullOwnRecipe("recipe-1");

    expect(recipe?.createdAt).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    expect(recipe?.updatedAt).toEqual(new Date("2026-10-02T00:00:00.000Z"));
    expect(recipe?.syncedAt).toBeInstanceOf(Date);
    expect(mockPut).toHaveBeenCalledWith(recipe);
  });

  it("normalizes a pulled recipe that has no canonical ids", async () => {
    fetchMock.mockResolvedValue(Response.json({ recipe: serverRecipe() }));

    await pullOwnRecipe("recipe-1");

    expect(mockNormalize).toHaveBeenCalledWith("recipe-1", [{ item: "beet" }]);
  });

  it("leaves an already-normalized recipe alone", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        recipe: serverRecipe({ canonicalIngredientIds: ["beet"] }),
      }),
    );

    await pullOwnRecipe("recipe-1");

    expect(mockNormalize).not.toHaveBeenCalled();
  });

  it("returns null for a missing or foreign recipe", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    fetchMock.mockResolvedValueOnce(Response.json({ recipe: null }));

    expect(await pullOwnRecipe("recipe-1")).toBeNull();
    expect(await pullOwnRecipe("recipe-1")).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });
});
