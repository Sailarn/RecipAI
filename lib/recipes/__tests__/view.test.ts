import { describe, expect, it } from "vitest";
import {
  type RecipeRow,
  recipeAppUrl,
  recipeAsText,
  toRecipeSummaryView,
  toRecipeView,
} from "../view";

const ORIGIN = "https://recip-ai-wine.vercel.app";

function row(overrides: Partial<RecipeRow> = {}): RecipeRow {
  return {
    id: "r1",
    userId: "u1",
    title: "Borscht",
    description: "Classic",
    imageUrl: null,
    imageFileId: null,
    imageFocusX: 50,
    imageFocusY: 50,
    imageCropX: null,
    imageCropY: null,
    imageCropWidth: null,
    imageCropHeight: null,
    prepTime: 15,
    cookTime: 60,
    totalTime: 75,
    servings: 6,
    ingredients: [
      { id: "i1", item: "beet", amount: 2, unit: "pcs", sectionId: "s1" },
      { id: "i2", item: "salt", modifiers: ["to_taste"] },
    ],
    instructions: [
      { id: "st2", order: 2, instruction: "Simmer" },
      { id: "st1", order: 1, instruction: "Chop", sectionId: "s1" },
    ],
    sections: [{ id: "s1", name: "Vegetables", order: 0 }],
    sourceUrl: "https://example.com/borscht",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    category: "Soup",
    status: "tried",
    isPublic: false,
    collectionIds: ["c1", "gone"],
    canonicalIngredientIds: ["v1", "v2"],
    unrecognizedIngredients: [],
    ...overrides,
  } as RecipeRow;
}

describe("toRecipeView", () => {
  it("inlines section names, numbers steps in order and hides internal ids", () => {
    const view = toRecipeView(row(), ORIGIN, new Map([["c1", "Weeknight"]]));

    expect(view.ingredients).toEqual([
      { item: "beet", amount: 2, unit: "pcs", section: "Vegetables" },
      { item: "salt", modifiers: ["to_taste"] },
    ]);
    expect(view.instructions).toEqual([
      { step: 1, instruction: "Chop", section: "Vegetables" },
      { step: 2, instruction: "Simmer" },
    ]);
    expect(view.collections).toEqual([{ id: "c1", name: "Weeknight" }]);
    expect(view.tried).toBe(true);
    expect(view.url).toBe(`${ORIGIN}/recipes/r1`);
    expect(JSON.stringify(view)).not.toContain("canonical");
    expect(JSON.stringify(view)).not.toContain('"i1"');
  });

  it("tolerates legacy rows without sections", () => {
    const view = toRecipeView(row({ sections: null }), ORIGIN);
    expect(view.ingredients[0]).not.toHaveProperty("section");
  });
});

describe("toRecipeSummaryView", () => {
  it("keeps list fields only", () => {
    expect(toRecipeSummaryView(row({ status: null }), ORIGIN)).toEqual({
      id: "r1",
      title: "Borscht",
      category: "Soup",
      servings: 6,
      totalTimeMinutes: 75,
      tried: false,
      updatedAt: "2026-01-02T00:00:00.000Z",
      url: `${ORIGIN}/recipes/r1`,
    });
  });
});

describe("recipeAsText", () => {
  it("renders a readable document with section headings", () => {
    const text = recipeAsText(toRecipeView(row(), ORIGIN));
    expect(text).toContain("# Borscht");
    expect(text).toContain("### Vegetables\n- 2 pcs beet");
    expect(text).toContain("- salt (to_taste)");
    expect(text).toContain("1. Chop");
    expect(text).toContain("Source: https://example.com/borscht");
  });
});

describe("recipeAppUrl", () => {
  it("encodes the id", () => {
    expect(recipeAppUrl(ORIGIN, "a/b")).toBe(`${ORIGIN}/recipes/a%2Fb`);
  });
});
