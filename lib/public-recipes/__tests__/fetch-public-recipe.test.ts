import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicRecipe } from "../fetch-public-recipe";

afterEach(() => {
  vi.unstubAllGlobals();
});

const publicRecipe = {
  id: "recipe-1",
  title: "Soup",
  servings: 2,
  ingredients: [],
  instructions: [],
  owner: { name: "Olena" },
};

describe("fetchPublicRecipe", () => {
  it("returns the recipe on a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ recipe: publicRecipe }),
      }),
    );

    const result = await fetchPublicRecipe("recipe-1");

    expect(fetch).toHaveBeenCalledWith("/api/recipes/recipe-1/public");
    expect(result).toEqual(publicRecipe);
  });

  it("returns null on a non-ok response instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchPublicRecipe("recipe-1");

    expect(result).toBeNull();
  });
});
