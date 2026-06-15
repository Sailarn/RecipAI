import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeRecipeIngredients } from "../normalize-ingredients";

// Stable mock references — vi.hoisted runs before vi.mock factories
const {
  mockFilterResult,
  mockDbIngredientsFilter,
  mockDbIngredientsPut,
  mockDbRecipesUpdate,
  mockSyncUpdate,
  mockGetIngredientEmbeddings,
  mockEnrichIngredient,
} = vi.hoisted(() => {
  const filterResult = { toArray: vi.fn(), first: vi.fn() };
  return {
    mockFilterResult: filterResult,
    mockDbIngredientsFilter: vi.fn(() => filterResult),
    mockDbIngredientsPut: vi.fn(),
    mockDbRecipesUpdate: vi.fn(),
    mockSyncUpdate: vi.fn(),
    mockGetIngredientEmbeddings: vi.fn(),
    mockEnrichIngredient: vi.fn(),
  };
});

vi.mock("@/lib/db/db", () => ({
  db: {
    ingredients: {
      filter: mockDbIngredientsFilter,
      put: mockDbIngredientsPut,
    },
    recipes: {
      update: mockDbRecipesUpdate,
    },
  },
}));

vi.mock("@/lib/db/supabase-sync", () => ({
  syncUpdate: mockSyncUpdate,
}));

vi.mock("@/lib/parse-recipe/embed-client", () => ({
  getIngredientEmbeddings: mockGetIngredientEmbeddings,
}));

vi.mock("@/lib/parse-recipe/enrich-ingredient", () => ({
  enrichIngredient: mockEnrichIngredient,
}));

// Vocab fixture — size 2, used to build the Fuse index.
// Tests that need no Fuse match use ingredients absent from this set.
const GARLIC = {
  id: "garlic",
  en: "garlic",
  ua: "часник",
  aliasesEn: ["garlic clove", "garlic cloves"],
  aliasesUa: ["часнику", "часником"],
  status: "confirmed" as const,
};
const ONION = {
  id: "onion",
  en: "onion",
  ua: "цибуля",
  aliasesEn: ["onions"],
  aliasesUa: ["цибулі"],
  status: "confirmed" as const,
};

beforeEach(() => {
  vi.clearAllMocks();

  // Vocab: garlic + onion (size 2 — fuseCache keyed by length, so consistent)
  mockFilterResult.toArray.mockResolvedValue([GARLIC, ONION]);
  // No existing provisional by default
  mockFilterResult.first.mockResolvedValue(null);

  // Dexie writes succeed
  mockDbIngredientsPut.mockResolvedValue(undefined);
  mockDbRecipesUpdate.mockResolvedValue(undefined);

  // Default vocab (garlic + onion) carries no embedding field, so the
  // embedding tier is skipped — only the tests below opt in by adding one.

  // Enrich is fire-and-forget — default to resolving
  mockEnrichIngredient.mockResolvedValue(undefined);
});

describe("normalizeRecipeIngredients", () => {
  describe("null-pattern pre-filter", () => {
    it("puts 'за смаком' into unrecognizedIngredients, not canonicalIngredientIds", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "за смаком" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds.filter(Boolean)).toHaveLength(0);
      expect(updates.unrecognizedIngredients).toContain("за смаком");
    });

    it("puts 'to taste' into unrecognizedIngredients", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "to taste" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.unrecognizedIngredients).toContain("to taste");
      expect(updates.canonicalIngredientIds.filter(Boolean)).toHaveLength(0);
    });

    it("puts 'optional' into unrecognizedIngredients", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "optional" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.unrecognizedIngredients).toContain("optional");
    });

    it("handles mixed: known ingredient before 'за смаком' → one canonical id, one unrecognized", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "garlic" },
        { item: "за смаком" },
      ]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
      expect(updates.unrecognizedIngredients).toContain("за смаком");
    });
  });

  describe("Fuse alias lookup", () => {
    it("matches an ingredient by its en name", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "garlic" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
    });

    it("matches an ingredient by its ua name", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "часник" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
    });

    it("matches via aliases_en", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "garlic cloves" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
    });

    it("matches via aliases_ua", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "часнику" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
    });

    it("matches via the ua hint when the item string itself doesn't match", async () => {
      // Transliterated item fails Fuse; ua hint "цибуля" succeeds
      await normalizeRecipeIngredients("recipe-1", [
        { item: "tsybulya", ua: "цибуля" },
      ]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("onion");
    });

    it("does not call enrichIngredient for Fuse-matched ingredients", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "garlic" }]);

      expect(mockEnrichIngredient).not.toHaveBeenCalled();
    });

    it("does not call db.ingredients.put for Fuse-matched ingredients", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "garlic" }]);

      expect(mockDbIngredientsPut).not.toHaveBeenCalled();
    });
  });

  describe("provisional creation", () => {
    it("creates a provisional Dexie entry for unrecognized ingredients", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      expect(mockDbIngredientsPut).toHaveBeenCalledOnce();
      const entry = mockDbIngredientsPut.mock.calls[0][0];
      expect(entry.en).toBe("xanthan gum");
      expect(entry.status).toBe("provisional");
    });

    it("assigns the provisional id to canonicalIngredientIds", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toHaveLength(1);
      expect(typeof updates.canonicalIngredientIds[0]).toBe("string");
    });

    it("passes ua hint and category to the provisional entry", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "xanthan gum", ua: "ксантанова камедь", category: "other" },
      ]);

      const entry = mockDbIngredientsPut.mock.calls[0][0];
      expect(entry.ua).toBe("ксантанова камедь");
      expect(entry.category).toBe("other");
    });

    it("fires enrichIngredient after provisional creation", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      expect(mockEnrichIngredient).toHaveBeenCalledOnce();
      const [id, rawText] = mockEnrichIngredient.mock.calls[0];
      expect(typeof id).toBe("string");
      expect(rawText).toBe("xanthan gum");
    });

    it("reuses an existing provisional entry with the same name instead of creating a duplicate", async () => {
      mockFilterResult.first.mockResolvedValue({
        id: "existing-prov-id",
        en: "xanthan gum",
        status: "provisional",
      });

      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      expect(mockDbIngredientsPut).not.toHaveBeenCalled();
      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("existing-prov-id");
    });

    it("resolves without throwing when Dexie put fails", async () => {
      mockDbIngredientsPut.mockRejectedValue(new Error("DB error"));

      await expect(
        normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]),
      ).resolves.not.toThrow();
    });
  });

  describe("batch processing", () => {
    it("processes multiple ingredients: Fuse-matched + provisional in one call", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "garlic" },
        { item: "xanthan gum" },
        { item: "onion" },
      ]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
      expect(updates.canonicalIngredientIds).toContain("onion");
      // 3 ids: garlic + provisional uuid + onion
      expect(updates.canonicalIngredientIds).toHaveLength(3);
    });

    it("sends all embedding-pending items to getIngredientEmbeddings in a single call", async () => {
      // Vocab carries an embedding so the embedding code path is entered
      mockFilterResult.toArray.mockResolvedValue([
        { ...GARLIC, embedding: [1, ...Array(383).fill(0)] },
        ONION,
      ]);
      // Return vectors orthogonal to garlic — both items fall to provisional
      mockGetIngredientEmbeddings.mockResolvedValue([
        [0, 1, ...Array(382).fill(0)],
        [0, 1, ...Array(382).fill(0)],
      ]);

      await normalizeRecipeIngredients("recipe-1", [
        { item: "xanthan gum" },
        { item: "carob powder" },
      ]);

      expect(mockGetIngredientEmbeddings).toHaveBeenCalledOnce();
      expect(mockGetIngredientEmbeddings.mock.calls[0][0]).toHaveLength(2);
    });
  });

  describe("output", () => {
    it("writes canonicalIngredientIds and unrecognizedIngredients to Dexie with the recipe id", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "garlic" },
        { item: "за смаком" },
      ]);

      expect(mockDbRecipesUpdate).toHaveBeenCalledOnce();
      const [recipeId, updates] = mockDbRecipesUpdate.mock.calls[0];
      expect(recipeId).toBe("recipe-1");
      expect(updates.canonicalIngredientIds).toContain("garlic");
      expect(updates.unrecognizedIngredients).toContain("за смаком");
    });

    it("calls syncUpdate with the same ids as the Dexie write", async () => {
      await normalizeRecipeIngredients("recipe-1", [{ item: "garlic" }]);

      expect(mockSyncUpdate).toHaveBeenCalledOnce();
      const [id, updates] = mockSyncUpdate.mock.calls[0];
      expect(id).toBe("recipe-1");
      expect(updates.canonicalIngredientIds).toContain("garlic");
    });

    it("writes empty canonicalIngredientIds when all ingredients are null-pattern", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "за смаком" },
        { item: "to taste" },
      ]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds.filter(Boolean)).toHaveLength(0);
      expect(updates.unrecognizedIngredients).toHaveLength(2);
    });
  });

  // Embedding tests last — they populate embeddingCache (module-level), keyed
  // by the count of embedded entries so the tests above (vocab without an
  // embedding field → size 0) are unaffected.
  describe("embedding tier", () => {
    // Unit vector (L2-normalized): dot product with itself is 1.0.
    const unitVector = [1, ...Array(383).fill(0)];
    const GARLIC_WITH_EMBEDDING = {
      ...GARLIC,
      embedding: unitVector,
    };

    it("matches a pending ingredient to the closest vocab embedding", async () => {
      mockFilterResult.toArray.mockResolvedValue([
        GARLIC_WITH_EMBEDDING,
        ONION,
      ]);
      // Query embedding identical to garlic's → cosine 1, far ahead of onion
      // (which has no embedding and is absent from the vocab vectors).
      mockGetIngredientEmbeddings.mockResolvedValue([unitVector]);

      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
      expect(mockEnrichIngredient).not.toHaveBeenCalled();
    });

    it("falls through to provisional when EmbedConsentRequired is thrown — does not propagate", async () => {
      mockFilterResult.toArray.mockResolvedValue([
        GARLIC_WITH_EMBEDDING,
        ONION,
      ]);
      mockGetIngredientEmbeddings.mockRejectedValue(
        new Error("EmbedConsentRequired"),
      );

      await expect(
        normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]),
      ).resolves.not.toThrow();

      expect(mockDbIngredientsPut).toHaveBeenCalled();
    });

    it("falls through to provisional when the embedding client throws a generic error", async () => {
      mockFilterResult.toArray.mockResolvedValue([
        GARLIC_WITH_EMBEDDING,
        ONION,
      ]);
      mockGetIngredientEmbeddings.mockRejectedValue(new Error("WASM crash"));

      await expect(
        normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]),
      ).resolves.not.toThrow();

      expect(mockDbIngredientsPut).toHaveBeenCalled();
    });
  });
});
