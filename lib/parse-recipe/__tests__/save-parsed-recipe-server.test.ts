import { beforeEach, describe, expect, it, vi } from "vitest";

const values = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db", () => ({
  db: { insert: vi.fn(() => ({ values })) },
}));
vi.mock("@/db/schema/recipes", () => ({ recipes: {} }));
const findRecipeIdBySource = vi.hoisted(() => vi.fn());
vi.mock("../find-recipe-by-source", () => ({ findRecipeIdBySource }));

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

beforeEach(() => {
  vi.clearAllMocks();
  findRecipeIdBySource.mockResolvedValue(null);
});

describe("saveParsedRecipeForUser", () => {
  it("inserts a recipe row for the user and returns its id", async () => {
    const { recipeId, alreadySaved } = await saveParsedRecipeForUser({
      userId: "user-1",
      parsed,
      sourceUrl: "https://example.com/recipe",
    });

    expect(typeof recipeId).toBe("string");
    expect(alreadySaved).toBe(false);
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

  it("stores unknown servings and totalTime as null when absent", async () => {
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
        servings: null,
        totalTime: null,
        sourceUrl: null,
      }),
    );
  });

  it("returns the user's existing recipe for a link already imported", async () => {
    findRecipeIdBySource.mockResolvedValue("existing-recipe");

    const saved = await saveParsedRecipeForUser({
      userId: "user-1",
      parsed,
      sourceUrl: "https://example.com/recipe?utm_source=x",
    });

    expect(findRecipeIdBySource).toHaveBeenCalledWith(
      "user-1",
      "https://example.com/recipe?utm_source=x",
    );
    expect(saved).toEqual({ recipeId: "existing-recipe", alreadySaved: true });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("never de-duplicates an import without a link", async () => {
    await saveParsedRecipeForUser({
      userId: "user-1",
      parsed,
      sourceUrl: null,
    });

    expect(findRecipeIdBySource).not.toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledOnce();
  });
});
