import { describe, expect, it } from "vitest";
import { clonePublicRecipe } from "../clone";
import type { PublicRecipe } from "../types";

const recipe: PublicRecipe = {
  id: "shared",
  title: "Soup",
  imageUrl: "https://example.com/soup.jpg",
  servings: 2,
  ingredients: [{ id: "old-ing", item: "Water" }],
  instructions: [{ id: "old-step", order: 3, instruction: "Boil" }],
  canonicalIngredientIds: ["water"],
  owner: { name: "Olena" },
};

describe("clonePublicRecipe", () => {
  it("creates an independent private recipe input", () => {
    const ids = ["new-ing", "new-step"];
    const cloned = clonePublicRecipe(recipe, () => ids.shift()!);

    expect(cloned).toEqual(
      expect.objectContaining({
        title: "Soup",
        isPublic: false,
        collectionIds: [],
        status: null,
        canonicalIngredientIds: ["water"],
        ingredients: [{ id: "new-ing", item: "Water" }],
        instructions: [{ id: "new-step", order: 1, instruction: "Boil" }],
      }),
    );
    expect(cloned).not.toHaveProperty("imageFileId");
  });
});
