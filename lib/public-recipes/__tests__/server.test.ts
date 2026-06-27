import { beforeEach, describe, expect, it, vi } from "vitest";

const queryOperators = vi.hoisted(() => ({
  and: vi.fn((...conditions: unknown[]) => ({ and: conditions })),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

vi.mock("server-only", () => ({}));

vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("drizzle-orm")>()),
  ...queryOperators,
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock("@/db/schema/auth", () => ({
  user: {
    image: "user.image",
    name: "user.name",
  },
}));

vi.mock("@/db/schema/recipes", () => ({
  recipes: {
    canonicalIngredientIds: "recipes.canonicalIngredientIds",
    category: "recipes.category",
    cookTime: "recipes.cookTime",
    description: "recipes.description",
    id: "recipes.id",
    imageCropHeight: "recipes.imageCropHeight",
    imageCropWidth: "recipes.imageCropWidth",
    imageCropX: "recipes.imageCropX",
    imageCropY: "recipes.imageCropY",
    imageFocusX: "recipes.imageFocusX",
    imageFocusY: "recipes.imageFocusY",
    imageUrl: "recipes.imageUrl",
    ingredients: "recipes.ingredients",
    instructions: "recipes.instructions",
    isPublic: "recipes.isPublic",
    prepTime: "recipes.prepTime",
    servings: "recipes.servings",
    sourceUrl: "recipes.sourceUrl",
    title: "recipes.title",
    totalTime: "recipes.totalTime",
    userId: "recipes.userId",
  },
}));

import { db } from "@/db";
import { getPublicRecipe } from "../server";

const publicRecipeRow = {
  id: "recipe-1",
  title: "Soup",
  description: "Warm",
  imageUrl: "https://example.com/soup.jpg",
  imageFocusX: 50,
  imageFocusY: 50,
  imageCropX: null,
  imageCropY: null,
  imageCropWidth: null,
  imageCropHeight: null,
  prepTime: 10,
  cookTime: 20,
  totalTime: 30,
  servings: 2,
  ingredients: [{ id: "ingredient-1", item: "Water" }],
  instructions: [{ id: "step-1", order: 1, instruction: "Boil" }],
  sourceUrl: null,
  category: "Soup",
  canonicalIngredientIds: ["water"],
  ownerName: "Olena",
  ownerImage: "https://example.com/owner.jpg",
};

function setupSelectQuery(rows: object[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  vi.mocked(db.select).mockReturnValue({ from } as never);

  return { from, innerJoin, limit, where };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPublicRecipe", () => {
  it("maps an allowlisted public row to a browser-safe DTO", async () => {
    setupSelectQuery([
      {
        ...publicRecipeRow,
        imageFileId: "private-file-id",
        ownerEmail: "private@example.com",
        userId: "user-1",
      },
    ]);

    const recipe = await getPublicRecipe("recipe-1");

    expect(recipe).toEqual({
      id: "recipe-1",
      title: "Soup",
      description: "Warm",
      imageUrl: "https://example.com/soup.jpg",
      imageFocusX: 50,
      imageFocusY: 50,
      imageCropX: undefined,
      imageCropY: undefined,
      imageCropWidth: undefined,
      imageCropHeight: undefined,
      prepTime: 10,
      cookTime: 20,
      totalTime: 30,
      servings: 2,
      ingredients: [{ id: "ingredient-1", item: "Water" }],
      instructions: [{ id: "step-1", order: 1, instruction: "Boil" }],
      sourceUrl: undefined,
      category: "Soup",
      canonicalIngredientIds: ["water"],
      owner: {
        name: "Olena",
        image: "https://example.com/owner.jpg",
      },
    });
  });

  it("returns null when no public recipe matches", async () => {
    setupSelectQuery([]);

    await expect(getPublicRecipe("missing-recipe")).resolves.toBeNull();
  });

  it("strips unknown fields from ingredients and instructions", async () => {
    setupSelectQuery([
      {
        ...publicRecipeRow,
        ingredients: [
          {
            id: "ingredient-1",
            amount: 2,
            unit: "cups",
            item: "Water",
            supplierCost: 100,
          },
        ],
        instructions: [
          {
            id: "step-1",
            order: 1,
            instruction: "Boil",
            imageUrl: "https://example.com/step.jpg",
            internalNote: "private",
          },
        ],
      },
    ]);

    const recipe = await getPublicRecipe("recipe-1");

    expect({
      ingredients: recipe?.ingredients,
      instructions: recipe?.instructions,
    }).toEqual({
      ingredients: [
        {
          id: "ingredient-1",
          amount: 2,
          unit: "cups",
          item: "Water",
        },
      ],
      instructions: [
        {
          id: "step-1",
          order: 1,
          instruction: "Boil",
          imageUrl: "https://example.com/step.jpg",
        },
      ],
    });
  });

  it("drops malformed entries and invalid optional values", async () => {
    setupSelectQuery([
      {
        ...publicRecipeRow,
        ingredients: [
          null,
          { id: "missing-item" },
          { id: "ingredient-1", item: "Water", amount: -1 },
          {
            id: "ingredient-2",
            item: "Salt",
            amount: Number.POSITIVE_INFINITY,
          },
        ],
        instructions: [
          "not-a-step",
          { id: "missing-order", instruction: "Skip" },
          { id: "step-1", order: 1, instruction: "Boil", imageUrl: 42 },
        ],
      },
    ]);

    const recipe = await getPublicRecipe("recipe-1");

    expect({
      ingredients: recipe?.ingredients,
      instructions: recipe?.instructions,
    }).toEqual({
      ingredients: [
        { id: "ingredient-1", item: "Water" },
        { id: "ingredient-2", item: "Salt" },
      ],
      instructions: [{ id: "step-1", order: 1, instruction: "Boil" }],
    });
  });

  it("keeps ingredients and steps that omit an id, synthesizing one", async () => {
    setupSelectQuery([
      {
        ...publicRecipeRow,
        ingredients: [
          { item: "water", unit: "g", amount: 305 },
          { item: "flour", unit: "g", amount: 430 },
        ],
        instructions: [
          { order: 1, instruction: "Mix water and yeast." },
          { order: 2, instruction: "Add flour." },
        ],
      },
    ]);

    const recipe = await getPublicRecipe("recipe-1");

    expect({
      ingredients: recipe?.ingredients,
      instructions: recipe?.instructions,
    }).toEqual({
      ingredients: [
        { id: "ing-0", item: "water", unit: "g", amount: 305 },
        { id: "ing-1", item: "flour", unit: "g", amount: 430 },
      ],
      instructions: [
        { id: "step-0", order: 1, instruction: "Mix water and yeast." },
        { id: "step-1", order: 2, instruction: "Add flour." },
      ],
    });
  });

  it("uses empty lists for malformed ingredient and instruction arrays", async () => {
    setupSelectQuery([
      {
        ...publicRecipeRow,
        ingredients: { private: "value" },
        instructions: "not-an-array",
      },
    ]);

    const recipe = await getPublicRecipe("recipe-1");

    expect({
      ingredients: recipe?.ingredients,
      instructions: recipe?.instructions,
    }).toEqual({ ingredients: [], instructions: [] });
  });

  it("removes malformed canonical ingredient IDs", async () => {
    setupSelectQuery([
      {
        ...publicRecipeRow,
        canonicalIngredientIds: ["water", { private: "value" }, 42],
      },
    ]);

    const recipe = await getPublicRecipe("recipe-1");

    expect(recipe?.canonicalIngredientIds).toEqual(["water"]);
  });

  it("selects only fields allowed by the public DTO", async () => {
    setupSelectQuery([publicRecipeRow]);

    await getPublicRecipe("recipe-1");

    expect(db.select).toHaveBeenCalledWith({
      id: "recipes.id",
      title: "recipes.title",
      description: "recipes.description",
      imageUrl: "recipes.imageUrl",
      imageFocusX: "recipes.imageFocusX",
      imageFocusY: "recipes.imageFocusY",
      imageCropX: "recipes.imageCropX",
      imageCropY: "recipes.imageCropY",
      imageCropWidth: "recipes.imageCropWidth",
      imageCropHeight: "recipes.imageCropHeight",
      prepTime: "recipes.prepTime",
      cookTime: "recipes.cookTime",
      totalTime: "recipes.totalTime",
      servings: "recipes.servings",
      ingredients: "recipes.ingredients",
      instructions: "recipes.instructions",
      sourceUrl: "recipes.sourceUrl",
      category: "recipes.category",
      canonicalIngredientIds: "recipes.canonicalIngredientIds",
      ownerName: "user.name",
      ownerImage: "user.image",
    });
  });

  it("constrains the query by recipe ID and public visibility", async () => {
    const { where } = setupSelectQuery([publicRecipeRow]);

    await getPublicRecipe("recipe-1");

    expect(where).toHaveBeenCalledWith({
      and: [
        { column: "recipes.id", value: "recipe-1" },
        { column: "recipes.isPublic", value: true },
      ],
    });
  });
});
