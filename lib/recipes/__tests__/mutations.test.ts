import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/upload/imagekit", () => ({ uploadImageServer: vi.fn() }));

import { createRecipeInputSchema, updateRecipeInputSchema } from "../input";
import {
  buildRecipeUpdate,
  buildShape,
  draftsFromRow,
  isFetchableImageUrl,
} from "../mutations";
import type { RecipeRow } from "../view";

const NOW = new Date("2026-11-03T12:00:00Z");

function row(overrides: Partial<RecipeRow> = {}): RecipeRow {
  return {
    id: "r1",
    userId: "u1",
    title: "Pierogi",
    description: "Dumplings",
    prepTime: 30,
    cookTime: 10,
    totalTime: 40,
    servings: 4,
    ingredients: [
      { id: "i1", item: "flour", amount: 500, unit: "g", sectionId: "s1" },
      {
        id: "i2",
        item: "potato",
        amount: 3,
        unit: "pcs",
        sectionId: "s2",
        original: "potatoes, boiled",
      },
    ],
    instructions: [
      {
        id: "st2",
        order: 2,
        instruction: "Fill and boil",
        sectionId: "s2",
        imageUrl: "https://ik.imagekit.io/x.jpg",
      },
      { id: "st1", order: 1, instruction: "Knead dough", sectionId: "s1" },
    ],
    sections: [
      { id: "s1", name: "Dough", order: 0 },
      { id: "s2", name: "Filling", order: 1 },
    ],
    canonicalIngredientIds: ["v1", "v2"],
    unrecognizedIngredients: [],
    status: null,
    category: "Dinner",
    sourceUrl: null,
    ...overrides,
  } as RecipeRow;
}

describe("draftsFromRow", () => {
  it("turns section ids back into names and orders steps", () => {
    const drafts = draftsFromRow(row());
    expect(drafts.ingredients[1]).toEqual({
      item: "potato",
      amount: 3,
      unit: "pcs",
      modifiers: undefined,
      section: "Filling",
      original: "potatoes, boiled",
    });
    expect(drafts.steps.map((step) => step.instruction)).toEqual([
      "Knead dough",
      "Fill and boil",
    ]);
    expect(drafts.steps[1].imageUrl).toBe("https://ik.imagekit.io/x.jpg");
  });
});

describe("buildRecipeUpdate", () => {
  it("changes only the fields given and always bumps updatedAt", () => {
    expect(buildRecipeUpdate(row(), { title: "Varenyky" }, NOW)).toEqual({
      title: "Varenyky",
      updatedAt: NOW,
    });
  });

  it("clears optional fields with null", () => {
    expect(
      buildRecipeUpdate(row(), { description: null, category: null }, NOW),
    ).toMatchObject({ description: null, category: null });
  });

  it("recomputes total time from the merged prep and cook times", () => {
    expect(
      buildRecipeUpdate(row(), { cookTimeMinutes: 20 }, NOW),
    ).toMatchObject({ prepTime: 30, cookTime: 20, totalTime: 50 });
    expect(
      buildRecipeUpdate(
        row(),
        { prepTimeMinutes: null, cookTimeMinutes: null },
        NOW,
      ),
    ).toMatchObject({ totalTime: null });
  });

  it("maps tried to the status column", () => {
    expect(buildRecipeUpdate(row(), { tried: true }, NOW).status).toBe("tried");
    expect(buildRecipeUpdate(row(), { tried: false }, NOW).status).toBeNull();
  });

  it("replacing ingredients keeps the steps' sections and resets normalization", () => {
    const update = buildRecipeUpdate(
      row(),
      {
        ingredients: [
          { item: "flour", amount: 400, unit: "g", section: "Dough" },
          { item: "cheese", amount: 200, unit: "g", section: "Filling" },
        ],
      },
      NOW,
    );

    const sections = update.sections as Array<{ id: string; name: string }>;
    expect(sections.map((section) => section.name)).toEqual([
      "Dough",
      "Filling",
    ]);
    const filling = sections.find((section) => section.name === "Filling");
    const steps = update.instructions as Array<{
      instruction: string;
      sectionId: string | null;
    }>;
    expect(
      steps.find((step) => step.instruction === "Fill and boil")?.sectionId,
    ).toBe(filling?.id);
    expect(update.canonicalIngredientIds).toBeNull();
    expect(update.unrecognizedIngredients).toBeNull();
  });

  it("replacing steps keeps ingredients and their normalization", () => {
    const update = buildRecipeUpdate(
      row(),
      { instructions: [{ instruction: "Just boil" }] },
      NOW,
    );
    const ingredients = update.ingredients as Array<{
      item: string;
      original?: string;
    }>;
    expect(ingredients.map((ingredient) => ingredient.item)).toEqual([
      "flour",
      "potato",
    ]);
    expect(ingredients[1].original).toBe("potatoes, boiled");
    expect(update).not.toHaveProperty("canonicalIngredientIds");
    expect((update.sections as unknown[]).length).toBe(2);
  });
});

describe("isFetchableImageUrl", () => {
  it("accepts public https hosts", () => {
    expect(isFetchableImageUrl("https://images.example.com/a.jpg")).toBe(true);
  });

  it.each([
    "http://images.example.com/a.jpg",
    "https://localhost/a.jpg",
    "https://127.0.0.1/a.jpg",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/a.jpg",
    "https://metadata.google.internal/a",
    "https://printer.local/a.jpg",
    "https://intranet/a.jpg",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isFetchableImageUrl(url)).toBe(false);
  });
});

describe("source links", () => {
  it("are stored without tracking parameters on update", () => {
    expect(
      buildRecipeUpdate(
        row(),
        { sourceUrl: "https://example.com/pie/?utm_source=chatgpt.com" },
        NOW,
      ).sourceUrl,
    ).toBe("https://example.com/pie/");
    expect(
      buildRecipeUpdate(row(), { sourceUrl: null }, NOW).sourceUrl,
    ).toBeNull();
  });
});

describe("step images", () => {
  it("are kept on the saved steps", () => {
    const shape = buildShape(
      [{ item: "flour" }],
      [{ instruction: "Knead", imageUrl: "https://img.example.com/1.jpg" }],
    );
    expect(shape.instructions[0].imageUrl).toBe(
      "https://img.example.com/1.jpg",
    );
  });

  it("must be https URLs", () => {
    const base = {
      title: "T",
      ingredients: [{ item: "a" }],
      instructions: [
        { instruction: "b", imageUrl: "http://img.example.com/1.jpg" },
      ],
    };
    expect(createRecipeInputSchema.safeParse(base).success).toBe(false);
  });
});

describe("update image input", () => {
  it("accepts a link or null", () => {
    expect(
      updateRecipeInputSchema.safeParse({
        imageUrl: "https://img.example.com/a.jpg",
      }).success,
    ).toBe(true);
    expect(updateRecipeInputSchema.safeParse({ imageUrl: null }).success).toBe(
      true,
    );
    expect(
      updateRecipeInputSchema.safeParse({ imageUrl: "ftp://x" }).success,
    ).toBe(false);
  });
});
