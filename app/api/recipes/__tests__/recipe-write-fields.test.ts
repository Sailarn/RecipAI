import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import { pickRecipeContent } from "../recipe-write-fields";

describe("pickRecipeContent", () => {
  it("keeps whitelisted content fields", () => {
    const input: Partial<Recipe> = {
      title: "Soup",
      servings: 4,
      ingredients: [],
      instructions: [],
      category: "soup",
    };

    expect(pickRecipeContent(input)).toEqual(input);
  });

  it("strips server-owned and device-local fields", () => {
    const input = {
      title: "Soup",
      id: "recipe-1",
      userId: "someone-else",
      createdAt: new Date(),
      updatedAt: new Date(),
      syncedAt: new Date(),
    } as Partial<Recipe>;

    expect(pickRecipeContent(input)).toEqual({ title: "Soup" });
  });

  it("omits undefined fields but keeps explicit nulls", () => {
    const input = {
      title: "Soup",
      description: undefined,
      servings: null,
    } as unknown as Partial<Recipe>;

    const picked = pickRecipeContent(input);

    expect(picked).toEqual({ title: "Soup", servings: null });
    expect("description" in picked).toBe(false);
  });
});
