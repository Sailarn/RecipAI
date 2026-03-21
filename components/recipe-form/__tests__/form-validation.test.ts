import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test just the schema validation logic
describe("Recipe Form Validation", () => {
  const createRecipeSchema = (t: (key: string) => string) => {
    return z.object({
      title: z.string().min(1, t("titleRequired")),
      servings: z.number().int().positive(t("servingsRequired")),
      ingredients: z.array(
        z.object({
          item: z.string().min(1, t("ingredientNameRequired")),
        })
      ).min(1, t("ingredientsRequired")),
    });
  };

  const schema = createRecipeSchema((key) => key);

  it("validates required title", () => {
    const result = schema.safeParse({
      title: "",
      servings: 4,
      ingredients: [{ item: "flour" }],
    });

    expect(result.success).toBe(false);
  });

  it("validates servings must be positive", () => {
    const result = schema.safeParse({
      title: "Recipe",
      servings: -1,
      ingredients: [{ item: "flour" }],
    });

    expect(result.success).toBe(false);
  });

  it("validates at least one ingredient required", () => {
    const result = schema.safeParse({
      title: "Recipe",
      servings: 4,
      ingredients: [],
    });

    expect(result.success).toBe(false);
  });

  it("passes validation with valid data", () => {
    const result = schema.safeParse({
      title: "Recipe",
      servings: 4,
      ingredients: [{ item: "flour" }],
    });

    expect(result.success).toBe(true);
  });
});