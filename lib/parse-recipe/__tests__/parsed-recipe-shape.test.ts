import { describe, expect, it } from "vitest";
import { buildSavedRecipeShape } from "../parsed-recipe-shape";

describe("buildSavedRecipeShape", () => {
  it("builds one shared section catalog for ingredients and steps", () => {
    let id = 0;
    const result = buildSavedRecipeShape(
      {
        ingredients: [
          {
            item: "Butter",
            modifiers: ["COLD"],
            section: "Dough",
            original: "cold butter",
          },
        ],
        instructions: [{ order: 1, instruction: "Mix.", section: "Dough" }],
      },
      () => `id-${++id}`,
    );

    expect(result).toEqual({
      sections: [{ id: "id-1", name: "Dough", order: 0 }],
      ingredients: [
        {
          id: "id-2",
          item: "Butter",
          amount: undefined,
          unit: undefined,
          modifiers: ["COLD"],
          sectionId: "id-1",
          original: "cold butter",
        },
      ],
      instructions: [
        {
          id: "id-3",
          order: 1,
          instruction: "Mix.",
          imageUrl: undefined,
          sectionId: "id-1",
        },
      ],
    });
  });

  it("filters invalid modifier keys from untrusted parsed data", () => {
    const result = buildSavedRecipeShape(
      {
        ingredients: [
          {
            item: "Butter",
            modifiers: ["COLD", "INVALID"] as unknown as ["COLD"],
          },
        ],
        instructions: [],
      },
      () => "row-id",
    );

    expect(result.ingredients[0].modifiers).toEqual(["COLD"]);
  });
});
