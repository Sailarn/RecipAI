import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeRecipeIngredients } from "../normalize-ingredients";

// Stable mock references — vi.hoisted runs before vi.mock factories
const {
  mockFilterResult,
  mockDbIngredientsFilter,
  mockDbIngredientsPut,
  mockDbRecipesUpdate,
  mockSyncUpdate,
  mockEnrichIngredient,
  mockTrackEvent,
} = vi.hoisted(() => {
  const filterResult = { toArray: vi.fn(), first: vi.fn() };
  return {
    mockFilterResult: filterResult,
    mockDbIngredientsFilter: vi.fn(() => filterResult),
    mockDbIngredientsPut: vi.fn(),
    mockDbRecipesUpdate: vi.fn(),
    mockSyncUpdate: vi.fn(),
    mockEnrichIngredient: vi.fn(),
    mockTrackEvent: vi.fn(),
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

vi.mock("@/lib/parse-recipe/enrich-ingredient", () => ({
  enrichIngredient: mockEnrichIngredient,
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: mockTrackEvent,
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

  // Default fetch: non-ok response so pending items fall through to provisional
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });

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

  describe("en head match key", () => {
    it("matches via the en head when the item string itself doesn't match", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "freshly minced ail", en: "garlic" },
      ]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
    });

    it("sends the en head in the embed-match payload", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ matches: [null], degraded: false }),
      });

      await normalizeRecipeIngredients("recipe-1", [
        { item: "2 small zucchini", en: "zucchini" },
      ]);

      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.items[0]).toMatchObject({
        item: "2 small zucchini",
        en: "zucchini",
      });
    });

    it("seeds the provisional with the en head, not the raw item", async () => {
      await normalizeRecipeIngredients("recipe-1", [
        { item: "2 small zucchini", en: "zucchini" },
      ]);

      const entry = mockDbIngredientsPut.mock.calls[0][0];
      expect(entry.en).toBe("zucchini");
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

    it("sends all embedding-pending items to the embed-match route in a single fetch call", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          matches: [null, null],
          degraded: false,
        }),
      });

      await normalizeRecipeIngredients("recipe-1", [
        { item: "xanthan gum" },
        { item: "carob powder" },
      ]);

      expect(globalThis.fetch).toHaveBeenCalledOnce();
      const body = JSON.parse(
        (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.items).toHaveLength(2);
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

  describe("embed-match route", () => {
    it("uses the embed-match route for items that miss text-match", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          matches: ["garlic"],
          degraded: false,
        }),
      });

      const result = await normalizeRecipeIngredients("recipe-1", [
        { item: "xanthan gum" },
      ]);

      const updates = mockDbRecipesUpdate.mock.calls[0][1];
      expect(updates.canonicalIngredientIds).toContain("garlic");
      expect(result.matched).toBe(1);
      expect(mockDbIngredientsPut).not.toHaveBeenCalled();
      expect(mockEnrichIngredient).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith("embed_match", {
        total: 1,
        textMatched: 0,
        embedMatched: 1,
        provisionalCreated: 0,
        degraded: false,
      });
    });

    it("creates a provisional when the route degrades", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          matches: [null],
          degraded: true,
        }),
      });

      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      // The route returned null — provisional is created and its id fills the slot
      expect(mockDbIngredientsPut).toHaveBeenCalledOnce();
      const entry = mockDbIngredientsPut.mock.calls[0][0];
      expect(entry.status).toBe("provisional");
      // enrichIngredient is fired for provisional items
      expect(mockEnrichIngredient).toHaveBeenCalledOnce();
      expect(mockTrackEvent).toHaveBeenCalledWith("embed_match", {
        total: 1,
        textMatched: 0,
        embedMatched: 0,
        provisionalCreated: 1,
        degraded: true,
      });
    });

    it("falls through to provisional when fetch throws", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(
        normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]),
      ).resolves.not.toThrow();

      expect(mockDbIngredientsPut).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith("embed_match", {
        total: 1,
        textMatched: 0,
        embedMatched: 0,
        provisionalCreated: 1,
        degraded: true,
      });
    });

    it("marks degraded and creates a provisional on a non-OK response", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });

      await normalizeRecipeIngredients("recipe-1", [{ item: "xanthan gum" }]);

      expect(mockDbIngredientsPut).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith("embed_match", {
        total: 1,
        textMatched: 0,
        embedMatched: 0,
        provisionalCreated: 1,
        degraded: true,
      });
    });
  });
});
