import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection, Recipe } from "@/lib/db/schema";
import { useRecipesPageState } from "../use-recipes-page-state";

vi.mock("@/hooks/use-live-query-transition", () => ({
  useLiveQueryTransition: vi.fn(),
}));

vi.mock("@/hooks/use-recipe-matcher", () => ({
  useRecipeMatcher: vi.fn(),
}));

vi.mock("@/lib/db/collections", () => ({
  createCollection: vi.fn(),
  deleteCollection: vi.fn(),
  getAllCollections: vi.fn(),
  renameCollection: vi.fn(),
}));

vi.mock("@/lib/db/recipes", () => ({
  getAllRecipes: vi.fn(),
}));

vi.mock("@/lib/recipes-prefetch", () => ({
  recipesPageCache: { recipes: undefined, collections: undefined },
}));

import { useLiveQueryTransition } from "@/hooks/use-live-query-transition";
import { useRecipeMatcher } from "@/hooks/use-recipe-matcher";
import {
  createCollection,
  deleteCollection,
  renameCollection,
} from "@/lib/db/collections";
import { recipesPageCache } from "@/lib/recipes-prefetch";

const mockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: "r1",
  title: "Borsch",
  servings: 4,
  ingredients: [],
  instructions: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

const mockCollection = (overrides: Partial<Collection> = {}): Collection => ({
  id: "c1",
  name: "Favourites",
  emoji: "⭐",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

const mockGetMissing = vi.fn().mockReturnValue(null);

function setupLiveQuery(
  recipes: Recipe[] | undefined,
  collections: Collection[] | undefined,
): { triggerRecipesError: () => void } {
  let callCount = 0;
  let capturedOnError: (() => void) | undefined;
  vi.mocked(useLiveQueryTransition).mockImplementation(
    (_querier, _deps, onError) => {
      callCount++;
      if (callCount === 1) capturedOnError = onError;
      return callCount === 1 ? recipes : collections;
    },
  );
  return { triggerRecipesError: () => capturedOnError?.() };
}

beforeEach(() => {
  vi.clearAllMocks();
  recipesPageCache.recipes = undefined;
  recipesPageCache.collections = undefined;
  vi.mocked(useRecipeMatcher).mockReturnValue({
    pantrySet: new Set<string>(),
    getMissing: mockGetMissing,
  });
  setupLiveQuery([], []);
});

describe("useRecipesPageState", () => {
  describe("loading state", () => {
    it("is loading when recipes live query returns undefined", () => {
      setupLiveQuery(undefined, []);

      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.loading).toBe(true);
      expect(result.current.recipes).toBeUndefined();
    });

    it("is not loading when recipes are available", () => {
      setupLiveQuery([mockRecipe()], []);

      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.loading).toBe(false);
      expect(result.current.recipes).toHaveLength(1);
    });
  });

  describe("collections", () => {
    it("returns collections from live query", () => {
      const collections = [mockCollection()];
      setupLiveQuery([], collections);

      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.collections).toEqual(collections);
    });

    it("falls back to cache when live query returns undefined", () => {
      const cached = [mockCollection({ id: "cached" })];
      recipesPageCache.collections = cached;
      setupLiveQuery([], undefined);

      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.collections).toEqual(cached);
    });

    it("returns empty array when both live query and cache are unavailable", () => {
      setupLiveQuery([], undefined);
      recipesPageCache.collections = undefined;

      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.collections).toEqual([]);
    });
  });

  describe("getMissing", () => {
    it("exposes getMissing from useRecipeMatcher", () => {
      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.getMissing).toBe(mockGetMissing);
    });
  });

  describe("newCollectionModal", () => {
    it("is closed by default", () => {
      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.newCollectionModal.isOpen).toBe(false);
    });

    it("opens when open() is called", () => {
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.newCollectionModal.open());

      expect(result.current.newCollectionModal.isOpen).toBe(true);
    });

    it("closes when close() is called", () => {
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.newCollectionModal.open());
      act(() => result.current.newCollectionModal.close());

      expect(result.current.newCollectionModal.isOpen).toBe(false);
    });

    it("calls createCollection and closes modal on onCreate", async () => {
      vi.mocked(createCollection).mockResolvedValue("new-id");
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.newCollectionModal.open());
      await act(() =>
        result.current.newCollectionModal.onCreate({
          name: "Dinner",
          emoji: "🍽️",
        }),
      );

      expect(createCollection).toHaveBeenCalledWith({
        name: "Dinner",
        emoji: "🍽️",
      });
      expect(result.current.newCollectionModal.isOpen).toBe(false);
    });
  });

  describe("editCollectionModal", () => {
    it("has no collection selected by default", () => {
      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.editCollectionModal.collection).toBeNull();
    });

    it("opens with the given collection when open() is called", () => {
      const collection = mockCollection();
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.editCollectionModal.open(collection));

      expect(result.current.editCollectionModal.collection).toEqual(collection);
    });

    it("clears the collection when close() is called", () => {
      const collection = mockCollection();
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.editCollectionModal.open(collection));
      act(() => result.current.editCollectionModal.close());

      expect(result.current.editCollectionModal.collection).toBeNull();
    });

    it("calls renameCollection with correct args on onSave", async () => {
      vi.mocked(renameCollection).mockResolvedValue();
      const collection = mockCollection({ id: "c1" });
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.editCollectionModal.open(collection));
      await act(() =>
        result.current.editCollectionModal.onSave({
          name: "Lunch",
          emoji: "🥗",
        }),
      );

      expect(renameCollection).toHaveBeenCalledWith("c1", "Lunch", "🥗");
    });

    it("does nothing on onSave when no collection is open", async () => {
      const { result } = renderHook(() => useRecipesPageState());

      await act(() =>
        result.current.editCollectionModal.onSave({ name: "X", emoji: "❓" }),
      );

      expect(renameCollection).not.toHaveBeenCalled();
    });

    it("calls deleteCollection and closes modal on onDelete", async () => {
      vi.mocked(deleteCollection).mockResolvedValue();
      const collection = mockCollection({ id: "c1" });
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.editCollectionModal.open(collection));
      await act(() => result.current.editCollectionModal.onDelete());

      expect(deleteCollection).toHaveBeenCalledWith("c1");
      expect(result.current.editCollectionModal.collection).toBeNull();
    });

    it("does nothing on onDelete when no collection is open", async () => {
      const { result } = renderHook(() => useRecipesPageState());

      await act(() => result.current.editCollectionModal.onDelete());

      expect(deleteCollection).not.toHaveBeenCalled();
    });

    it("resets active collectionId filter when the active collection is deleted", async () => {
      vi.mocked(deleteCollection).mockResolvedValue();
      const collections = [mockCollection({ id: "c1" })];
      setupLiveQuery([mockRecipe({ collectionIds: ["c1"] })], collections);
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.filter.setCollectionId("c1"));
      act(() => result.current.editCollectionModal.open(collections[0]));
      await act(() => result.current.editCollectionModal.onDelete());

      expect(result.current.filter.collectionId).toBeNull();
    });

    it("does not reset collectionId filter when a different collection is deleted", async () => {
      vi.mocked(deleteCollection).mockResolvedValue();
      const collections = [
        mockCollection({ id: "c1" }),
        mockCollection({ id: "c2", name: "Other" }),
      ];
      setupLiveQuery([mockRecipe()], collections);
      const { result } = renderHook(() => useRecipesPageState());

      act(() => result.current.filter.setCollectionId("c1"));
      act(() => result.current.editCollectionModal.open(collections[1]));
      await act(() => result.current.editCollectionModal.onDelete());

      expect(result.current.filter.collectionId).toBe("c1");
    });
  });

  describe("recipesError", () => {
    it("is false by default", () => {
      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.recipesError).toBe(false);
    });

    it("becomes true when the recipes live query fires an error", () => {
      const { triggerRecipesError } = setupLiveQuery(undefined, []);
      const { result } = renderHook(() => useRecipesPageState());

      act(() => triggerRecipesError());

      expect(result.current.recipesError).toBe(true);
    });

    it("does not set recipesError when collections live query fires an error", () => {
      let callCount = 0;
      vi.mocked(useLiveQueryTransition).mockImplementation(
        (_querier, _deps, onError) => {
          callCount++;
          // Only call onError for the second call (collections query)
          if (callCount === 2) onError?.();
          return undefined;
        },
      );
      const { result } = renderHook(() => useRecipesPageState());

      expect(result.current.recipesError).toBe(false);
    });
  });
});
