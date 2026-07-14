import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockToArray, mockUpdateRecipe } = vi.hoisted(() => ({
  mockToArray: vi.fn(),
  mockUpdateRecipe: vi.fn(),
}));

vi.mock("../db", () => ({
  db: { recipes: { toArray: mockToArray } },
}));

vi.mock("../recipes", () => ({
  updateRecipe: mockUpdateRecipe,
}));

import { migrateLegacyRecipeShapes } from "../migrate-recipe-shape";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateRecipe.mockResolvedValue(undefined);
});

describe("migrateLegacyRecipeShapes", () => {
  it("converts a legacy single modifier + string section into modifiers[] + sectionId/sections", async () => {
    mockToArray.mockResolvedValue([
      {
        id: "r1",
        ingredients: [
          {
            id: "i1",
            item: "Mozzarella",
            modifier: "GRATED",
            section: "For the base",
          },
          { id: "i2", item: "Water" },
        ],
        instructions: [
          { id: "s1", order: 1, instruction: "Mix", section: "For the base" },
        ],
      },
    ]);

    await migrateLegacyRecipeShapes();

    expect(mockUpdateRecipe).toHaveBeenCalledOnce();
    const [id, updates] = mockUpdateRecipe.mock.calls[0];
    expect(id).toBe("r1");
    expect(updates.sections).toEqual([
      { id: expect.any(String), name: "For the base", order: 0 },
    ]);
    const sectionId = updates.sections[0].id;
    expect(updates.ingredients[0]).toMatchObject({
      item: "Mozzarella",
      modifiers: ["GRATED"],
      sectionId,
    });
    expect(updates.ingredients[0].modifier).toBeUndefined();
    expect(updates.ingredients[0].section).toBeUndefined();
    expect(updates.ingredients[1]).toMatchObject({
      item: "Water",
      modifiers: [],
      sectionId: null,
    });
    expect(updates.instructions[0].sectionId).toBe(sectionId);
    expect(updates.instructions[0].section).toBeUndefined();
  });

  it("skips a recipe that already has a sections array (already migrated)", async () => {
    mockToArray.mockResolvedValue([
      {
        id: "r2",
        sections: [],
        ingredients: [{ id: "i1", item: "Salt", modifiers: [] }],
        instructions: [],
      },
    ]);

    await migrateLegacyRecipeShapes();

    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it("skips a recipe with no legacy modifier/section fields at all", async () => {
    mockToArray.mockResolvedValue([
      {
        id: "r3",
        ingredients: [{ id: "i1", item: "Salt" }],
        instructions: [{ id: "s1", order: 1, instruction: "Mix" }],
      },
    ]);

    await migrateLegacyRecipeShapes();

    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it("drops an invalid legacy modifier key", async () => {
    mockToArray.mockResolvedValue([
      {
        id: "r4",
        ingredients: [{ id: "i1", item: "Butter", modifier: "NOT_A_MODIFIER" }],
        instructions: [],
      },
    ]);

    await migrateLegacyRecipeShapes();

    const [, updates] = mockUpdateRecipe.mock.calls[0];
    expect(updates.ingredients[0].modifiers).toEqual([]);
  });
});
