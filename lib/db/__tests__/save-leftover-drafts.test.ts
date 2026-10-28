import "./test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db";
import type { ParsedRecipeEntry, Recipe } from "../schema";

const saveParsedRecipe = vi.hoisted(() => vi.fn());
vi.mock("../save-parsed-recipe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../save-parsed-recipe")>()),
  saveParsedRecipe,
}));

import { saveLeftoverParseDrafts } from "../save-leftover-drafts";

function draft(id: string, sourceUrl?: string): ParsedRecipeEntry {
  return {
    id,
    title: id,
    servings: null,
    ingredients: [],
    instructions: [],
    sourceUrl,
    createdAt: new Date(),
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  saveParsedRecipe.mockResolvedValue("saved-id");
  await db.parsedRecipes.clear();
  await db.recipes.clear();
});

describe("saveLeftoverParseDrafts", () => {
  it("saves every waiting draft and empties the table", async () => {
    await db.parsedRecipes.bulkAdd([
      draft("a", "https://example.com/a"),
      draft("b"),
    ]);

    await saveLeftoverParseDrafts();

    expect(saveParsedRecipe).toHaveBeenCalledTimes(2);
    expect(await db.parsedRecipes.count()).toBe(0);
  });

  it("skips a draft whose link is already in the library", async () => {
    await db.recipes.add({
      id: "existing",
      title: "A",
      sourceUrl: "https://www.example.com/a?utm_source=x",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Recipe);
    await db.parsedRecipes.add(draft("a", "https://example.com/a"));

    await saveLeftoverParseDrafts();

    expect(saveParsedRecipe).not.toHaveBeenCalled();
    expect(await db.parsedRecipes.count()).toBe(0);
  });

  it("does nothing when there are no drafts", async () => {
    await saveLeftoverParseDrafts();

    expect(saveParsedRecipe).not.toHaveBeenCalled();
  });
});
