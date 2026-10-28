/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { RecipeIngredient, VocabularyIngredient } from "@/lib/db/schema";
import { useServingsCalculator } from "../use-servings-calculator";

const bulkGet = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/db", () => ({
  db: { ingredients: { bulkGet }, pantry: { toArray: vi.fn() } },
}));
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => [] }));
vi.mock("@/lib/db/pantry", () => ({ addPantryItem: vi.fn() }));

const FLOUR = { item: "flour" } as RecipeIngredient;
const FLOUR_VOCAB = { id: "flour", en: "Flour", ua: "Борошно" };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

describe("useServingsCalculator", () => {
  describe("canonical names", () => {
    it("names an ingredient in the current locale", async () => {
      bulkGet.mockResolvedValue([FLOUR_VOCAB]);

      const { result } = renderHook(() =>
        useServingsCalculator({
          originalServings: 2,
          canonicalIngredientIds: ["flour"],
          locale: "uk",
        }),
      );

      await waitFor(() =>
        expect(result.current.displayName(FLOUR, 0)).toBe("Борошно"),
      );
    });

    it("ignores a lookup that resolves after the locale changed", async () => {
      const stale = deferred<VocabularyIngredient[]>();
      const fresh = deferred<VocabularyIngredient[]>();
      bulkGet
        .mockReturnValueOnce(stale.promise)
        .mockReturnValueOnce(fresh.promise);
      const ids = ["flour"];
      const { result, rerender } = renderHook(
        ({ locale }) =>
          useServingsCalculator({
            originalServings: 2,
            canonicalIngredientIds: ids,
            locale,
          }),
        { initialProps: { locale: "uk" } },
      );
      rerender({ locale: "en" });

      await act(async () => {
        fresh.resolve([FLOUR_VOCAB] as VocabularyIngredient[]);
        await fresh.promise;
      });
      await act(async () => {
        stale.resolve([FLOUR_VOCAB] as VocabularyIngredient[]);
        await stale.promise;
      });

      expect(result.current.displayName(FLOUR, 0)).toBe("Flour");
    });
  });
});
