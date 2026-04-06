import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS, RECIPE_CATEGORIES } from "../categories";

describe("RECIPE_CATEGORIES", () => {
  it("contains all expected categories", () => {
    expect(RECIPE_CATEGORIES).toContain("Breakfast");
    expect(RECIPE_CATEGORIES).toContain("Lunch");
    expect(RECIPE_CATEGORIES).toContain("Dinner");
    expect(RECIPE_CATEGORIES).toContain("Dessert");
    expect(RECIPE_CATEGORIES).toContain("Other");
  });

  it("has 10 categories", () => {
    expect(RECIPE_CATEGORIES).toHaveLength(10);
  });
});

describe("CATEGORY_COLORS", () => {
  it("has a color entry for every category", () => {
    for (const category of RECIPE_CATEGORIES) {
      expect(CATEGORY_COLORS[category]).toBeDefined();
    }
  });

  it("each color value contains both bg and text classes", () => {
    for (const [, value] of Object.entries(CATEGORY_COLORS)) {
      expect(value).toMatch(/bg-/);
      expect(value).toMatch(/text-/);
    }
  });
});
