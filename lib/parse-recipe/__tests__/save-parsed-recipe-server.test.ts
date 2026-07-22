import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db", () => ({
  db: { insert: vi.fn(() => ({ values })) },
}));
vi.mock("@/db/schema/recipes", () => ({ recipes: {} }));

import { db } from "@/db";
import type { ParsedRecipe } from "@/lib/db/schema";
import { saveParsedRecipeForUser } from "../save-parsed-recipe-server";

const parsed = {
  title: "Pasta",
  description: "Tasty",
  imageUrl: "https://ik.imagekit.io/x.jpg",
  imageFileId: "file-1",
  prepTime: 10,
  cookTime: 20,
  servings: 2,
  ingredients: [{ item: "pasta", amount: 1, unit: "cup" }],
  instructions: [{ order: 1, instruction: "Boil" }],
  category: "dinner",
} as unknown as ParsedRecipe;

describe("saveParsedRecipeForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a recipe row for the user and returns its id", async () => {
    const recipeId = await saveParsedRecipeForUser({
      userId: "user-1",
      parsed,
      sourceUrl: "https://example.com/recipe",
    });

    expect(typeof recipeId).toBe("string");
    expect(db.insert).toHaveBeenCalledOnce();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: recipeId,
        userId: "user-1",
        title: "Pasta",
        sourceUrl: "https://example.com/recipe",
        totalTime: 30,
        servings: 2,
      }),
    );
  });

  it("defaults servings to 1 and totalTime to null when absent", async () => {
    await saveParsedRecipeForUser({
      userId: "user-1",
      parsed: {
        title: "Bare",
        ingredients: [],
        instructions: [],
      } as unknown as ParsedRecipe,
      sourceUrl: null,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        servings: 1,
        totalTime: null,
        sourceUrl: null,
      }),
    );
  });
});
