import { describe, expect, it } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import { getDefaultValues } from "../default-values";
import { createRecipeSchema, type RecipeOutput } from "../schema";

const schema = createRecipeSchema((key) => key);

const validIngredient = { item: "flour", amount: "2", unit: "cups" };
const validBase = {
  title: "Test Recipe",
  servings: "4",
  ingredients: [validIngredient],
};

describe("createRecipeSchema", () => {
  describe("title", () => {
    it("fails when title is empty", () => {
      const result = schema.safeParse({ ...validBase, title: "" });
      expect(result.success).toBe(false);
    });

    it("passes with a non-empty title", () => {
      const result = schema.safeParse(validBase);
      expect(result.success).toBe(true);
    });
  });

  describe("servings", () => {
    it("treats an empty servings field as unknown", () => {
      const result = schema.safeParse({ ...validBase, servings: "" });

      expect(result.success && result.data.servings).toBeNull();
    });

    it("fails when servings is non-numeric", () => {
      const result = schema.safeParse({ ...validBase, servings: "abc" });
      expect(result.success).toBe(false);
    });

    it("fails when servings is zero", () => {
      const result = schema.safeParse({ ...validBase, servings: "0" });
      expect(result.success).toBe(false);
    });

    it("fails when servings is negative", () => {
      const result = schema.safeParse({ ...validBase, servings: "-1" });
      expect(result.success).toBe(false);
    });

    it("transforms servings string to number on success", () => {
      const result = schema.safeParse(validBase);
      expect(result.success).toBe(true);
      expect((result as { data: RecipeOutput }).data.servings).toBe(4);
    });
  });

  describe("ingredients", () => {
    it("fails when ingredients array is empty", () => {
      const result = schema.safeParse({ ...validBase, ingredients: [] });
      expect(result.success).toBe(false);
    });

    it("fails when ingredient item is empty", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ item: "", amount: "1" }],
      });
      expect(result.success).toBe(false);
    });

    it("passes when ingredient amount is empty", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ item: "salt", amount: "" }],
      });

      expect(result.success).toBe(true);
      expect(
        (result as { data: RecipeOutput }).data.ingredients[0].amount,
      ).toBe(undefined);
    });

    it("accepts a null AI original field", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ ...validIngredient, original: null }],
      });

      expect(result.success).toBe(true);
    });

    it("fails when ingredient amount is non-numeric", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ item: "flour", amount: "abc" }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when ingredient amount is zero", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ item: "flour", amount: "0" }],
      });
      expect(result.success).toBe(false);
    });

    it("fails when ingredient amount is negative", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ item: "flour", amount: "-1" }],
      });
      expect(result.success).toBe(false);
    });

    it("transforms amount string to float on success", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ item: "flour", amount: "1.5" }],
      });
      expect(result.success).toBe(true);
      const output = (result as { data: RecipeOutput }).data;
      expect(output.ingredients[0].amount).toBe(1.5);
    });

    it("preserves additive and grouping metadata on the same ingredient row", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [
          {
            ...validIngredient,
            rowId: "ingredient-1",
            modifiers: ["COLD", "GRATED"],
            sectionId: "dough",
            original: "cold grated flour",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect((result as { data: RecipeOutput }).data.ingredients[0]).toEqual({
        item: "flour",
        amount: 2,
        unit: "cups",
        rowId: "ingredient-1",
        modifiers: ["COLD", "GRATED"],
        sectionId: "dough",
        original: "cold grated flour",
      });
    });

    it("rejects unknown additive keys", () => {
      const result = schema.safeParse({
        ...validBase,
        ingredients: [{ ...validIngredient, modifiers: ["NOT_A_MODIFIER"] }],
      });

      expect(result.success).toBe(false);
    });
  });

  describe("optional url fields", () => {
    it("passes when imageUrl is empty string", () => {
      const result = schema.safeParse({ ...validBase, imageUrl: "" });
      expect(result.success).toBe(true);
    });

    it("fails when imageUrl is an invalid URL", () => {
      const result = schema.safeParse({ ...validBase, imageUrl: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("passes when imageUrl is a valid URL", () => {
      const result = schema.safeParse({
        ...validBase,
        imageUrl: "https://example.com/image.jpg",
      });
      expect(result.success).toBe(true);
    });

    it("passes when sourceUrl is empty string", () => {
      const result = schema.safeParse({ ...validBase, sourceUrl: "" });
      expect(result.success).toBe(true);
    });

    it("fails when sourceUrl is an invalid URL", () => {
      const result = schema.safeParse({ ...validBase, sourceUrl: "not-a-url" });
      expect(result.success).toBe(false);
    });
  });

  describe("instructions", () => {
    it("passes without instructions", () => {
      const result = schema.safeParse(validBase);
      expect(result.success).toBe(true);
    });

    it("filters out instructions with empty text", () => {
      const result = schema.safeParse({
        ...validBase,
        instructions: [
          { instruction: "Mix well" },
          { instruction: "" },
          { instruction: "  " },
        ],
      });
      expect(result.success).toBe(true);
      const output = (result as { data: RecipeOutput }).data;
      expect(output.instructions).toHaveLength(1);
      expect(output.instructions![0].instruction).toBe("Mix well");
    });

    it("preserves row and section identity while filtering blank steps", () => {
      const result = schema.safeParse({
        ...validBase,
        sections: [{ id: "dough", name: "Dough", order: 0 }],
        instructions: [
          {
            rowId: "step-1",
            instruction: "Mix well",
            sectionId: "dough",
          },
          { rowId: "step-2", instruction: " ", sectionId: null },
        ],
      });

      expect(result.success).toBe(true);
      const output = (result as { data: RecipeOutput }).data;
      expect(output.sections).toEqual([
        { id: "dough", name: "Dough", order: 0 },
      ]);
      expect(output.instructions).toEqual([
        {
          rowId: "step-1",
          instruction: "Mix well",
          sectionId: "dough",
        },
      ]);
    });
  });
});

describe("getDefaultValues", () => {
  it("maps a Recipe to form values", () => {
    const recipe: Recipe = {
      id: "1",
      title: "Borsch",
      description: "Ukrainian soup",
      servings: 4,
      prepTime: 15,
      cookTime: 60,
      imageUrl: "https://example.com/img.jpg",
      sourceUrl: "https://example.com",
      category: "soup",
      ingredients: [{ id: "i1", item: "beets", amount: 3, unit: "pcs" }],
      instructions: [{ id: "s1", order: 1, instruction: "Boil beets" }],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const defaults = getDefaultValues(recipe);
    expect(defaults.title).toBe("Borsch");
    expect(defaults.servings).toBe("4");
    expect(defaults.prepTime).toBe(15);
    expect(defaults.cookTime).toBe(60);
    expect(defaults.category).toBe("soup");
    expect(defaults.ingredients[0].item).toBe("beets");
    expect(defaults.ingredients[0].amount).toBe("3");
    expect(defaults.ingredients[0].unit).toBe("pcs");
    expect(defaults.instructions![0].instruction).toBe("Boil beets");
    expect(defaults.ingredients[0].rowId).toBe("i1");
    expect(defaults.instructions![0].rowId).toBe("s1");
  });

  it("maps existing additives and section references into form rows", () => {
    const recipe: Recipe = {
      id: "1",
      title: "Dough",
      servings: 2,
      sections: [{ id: "dough", name: "Dough", order: 0 }],
      ingredients: [
        {
          id: "i1",
          item: "butter",
          modifiers: ["COLD"],
          sectionId: "dough",
          original: "cold butter",
        },
      ],
      instructions: [
        { id: "s1", instruction: "Mix.", order: 1, sectionId: "dough" },
      ],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const defaults = getDefaultValues(recipe);

    expect(defaults.sections).toEqual([
      { id: "dough", name: "Dough", order: 0 },
    ]);
    expect(defaults.ingredients[0]).toMatchObject({
      modifiers: ["COLD"],
      sectionId: "dough",
      original: "cold butter",
    });
    expect(defaults.instructions?.[0]).toMatchObject({ sectionId: "dough" });
  });
});
