import "./test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../db";
import {
  createRecipe,
  deleteRecipe,
  getAllRecipes,
  getRecipe,
  updateRecipe,
} from "../recipes";

// Clear database before each test
beforeEach(async () => {
  await db.recipes.clear();
});

describe("Recipe CRUD Operations", () => {
  it("should create a recipe", async () => {
    const recipeData = {
      title: "Test Recipe",
      servings: 4,
      ingredients: [{ id: "1", item: "flour", amount: 2, unit: "cups" }],
      instructions: [{ id: "1", order: 1, instruction: "Mix ingredients" }],
    };

    const id = await createRecipe(recipeData);
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("should get a recipe by id", async () => {
    const id = await createRecipe({
      title: "Test Recipe",
      servings: 2,
      ingredients: [],
      instructions: [],
    });

    const recipe = await getRecipe(id);
    expect(recipe).toBeDefined();
    expect(recipe?.title).toBe("Test Recipe");
    expect(recipe?.servings).toBe(2);
  });

  it("should get all recipes", async () => {
    await createRecipe({
      title: "Recipe 1",
      servings: 2,
      ingredients: [],
      instructions: [],
    });
    await createRecipe({
      title: "Recipe 2",
      servings: 4,
      ingredients: [],
      instructions: [],
    });

    const recipes = await getAllRecipes();
    expect(recipes).toHaveLength(2);
  });

  it("should update a recipe", async () => {
    const id = await createRecipe({
      title: "Original Title",
      servings: 2,
      ingredients: [],
      instructions: [],
    });

    await updateRecipe(id, { title: "Updated Title" });

    const updated = await getRecipe(id);
    expect(updated?.title).toBe("Updated Title");
    expect(updated?.servings).toBe(2); // Unchanged
  });

  it("should delete a recipe", async () => {
    const id = await createRecipe({
      title: "To Delete",
      servings: 2,
      ingredients: [],
      instructions: [],
    });

    await deleteRecipe(id);

    const deleted = await getRecipe(id);
    expect(deleted).toBeUndefined();
  });
});
