import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockIsSignedIn,
  mockPantryModify,
  mockRecipesToArray,
  mockRecipesUpdate,
  mockIngredientsDelete,
  mockIngredientsUpdate,
  mockSyncUpdate,
} = vi.hoisted(() => ({
  mockIsSignedIn: vi.fn(),
  mockPantryModify: vi.fn(),
  mockRecipesToArray: vi.fn(),
  mockRecipesUpdate: vi.fn(),
  mockIngredientsDelete: vi.fn(),
  mockIngredientsUpdate: vi.fn(),
  mockSyncUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/session-state", () => ({
  isSignedIn: mockIsSignedIn,
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    pantry: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({ modify: mockPantryModify }),
      }),
    },
    recipes: {
      filter: vi.fn().mockReturnValue({ toArray: mockRecipesToArray }),
      update: mockRecipesUpdate,
    },
    ingredients: {
      delete: mockIngredientsDelete,
      update: mockIngredientsUpdate,
    },
  },
}));

vi.mock("@/lib/db/supabase-sync", () => ({
  syncUpdate: mockSyncUpdate,
}));

vi.mock("@/lib/routes", () => ({
  api: { ingredientsEnrich: "/api/ingredients/enrich" },
}));

import { enrichIngredient } from "../enrich-ingredient";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  mockIsSignedIn.mockReturnValue(true);
  mockPantryModify.mockResolvedValue(undefined);
  mockRecipesToArray.mockResolvedValue([]);
  mockRecipesUpdate.mockResolvedValue(undefined);
  mockIngredientsDelete.mockResolvedValue(undefined);
  mockIngredientsUpdate.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("enrichIngredient", () => {
  describe("not signed in", () => {
    it("returns early without fetching", async () => {
      mockIsSignedIn.mockReturnValue(false);

      await enrichIngredient("uuid-1", "salt");

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("mergedInto path", () => {
    it("repoints pantry and recipes, deletes provisional, calls syncUpdate", async () => {
      const recipe = {
        id: "recipe-1",
        canonicalIngredientIds: ["uuid-1", "garlic", ""],
        updatedAt: new Date("2024-01-01"),
      };
      mockRecipesToArray.mockResolvedValue([recipe]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, mergedInto: "salt" }),
      });

      await enrichIngredient("uuid-1", "salt");

      expect(mockPantryModify).toHaveBeenCalledWith({ ingredientId: "salt" });

      expect(mockRecipesUpdate).toHaveBeenCalledWith("recipe-1", {
        canonicalIngredientIds: ["salt", "garlic", ""],
        updatedAt: expect.any(Date),
      });

      expect(mockSyncUpdate).toHaveBeenCalledWith(
        "recipe-1",
        expect.objectContaining({
          canonicalIngredientIds: ["salt", "garlic", ""],
        }),
      );

      expect(mockIngredientsDelete).toHaveBeenCalledWith("uuid-1");
      expect(mockIngredientsUpdate).not.toHaveBeenCalled();
    });

    it("does not call syncUpdate when no recipes contain the provisional id", async () => {
      mockRecipesToArray.mockResolvedValue([]);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, mergedInto: "salt" }),
      });

      await enrichIngredient("uuid-1", "salt");

      expect(mockSyncUpdate).not.toHaveBeenCalled();
      expect(mockRecipesUpdate).not.toHaveBeenCalled();
      expect(mockIngredientsDelete).toHaveBeenCalledWith("uuid-1");
    });
  });

  describe("ingredient path (confirm in place)", () => {
    it("updates the ingredient in dexie as confirmed", async () => {
      const enrichedData = {
        en: "flour",
        ua: "борошно",
        category: "grain",
        aliasesEn: [],
        aliasesUa: [],
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ success: true, ingredient: enrichedData }),
      });

      await enrichIngredient("uuid-flour", "flour");

      expect(mockIngredientsUpdate).toHaveBeenCalledWith("uuid-flour", {
        ...enrichedData,
        status: "confirmed",
      });
      expect(mockIngredientsDelete).not.toHaveBeenCalled();
      expect(mockSyncUpdate).not.toHaveBeenCalled();
    });
  });

  describe("non-ok response", () => {
    it("returns early without updating dexie", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      await enrichIngredient("uuid-1", "salt");

      expect(mockIngredientsUpdate).not.toHaveBeenCalled();
      expect(mockIngredientsDelete).not.toHaveBeenCalled();
    });
  });
});
