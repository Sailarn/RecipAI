import "./test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db";
import {
  createRecipe,
  deleteRecipe,
  discardRecipeImage,
  getAllRecipes,
  getRecipe,
  restoreRecipe,
  updateRecipe,
} from "../recipes";

vi.mock("../supabase-sync", () => ({
  syncCreate: vi.fn(),
  syncUpdate: vi.fn(),
  syncDelete: vi.fn(),
}));

vi.mock("../../upload/images", () => ({
  deleteImage: vi.fn(),
}));

import { deleteImage } from "../../upload/images";
import { syncCreate, syncDelete, syncUpdate } from "../supabase-sync";

beforeEach(async () => {
  await db.recipes.clear();
  await db.parsedRecipes.clear();
  vi.clearAllMocks();
});

describe("Recipe CRUD Operations", () => {
  it("should create a recipe and return a string id", async () => {
    const id = await createRecipe({
      title: "Test Recipe",
      servings: 4,
      ingredients: [{ id: "1", item: "flour", amount: 2, unit: "cups" }],
      instructions: [{ id: "1", order: 1, instruction: "Mix ingredients" }],
    });

    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("should set createdAt and updatedAt on create", async () => {
    const before = new Date();
    const id = await createRecipe({
      title: "Timestamp Test",
      servings: 1,
      ingredients: [],
      instructions: [],
    });
    const after = new Date();

    const recipe = await getRecipe(id);
    expect(recipe?.createdAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(recipe?.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(recipe?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(recipe?.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("should store new recipes as private when visibility is omitted", async () => {
    const id = await createRecipe({
      title: "Private Recipe",
      servings: 1,
      ingredients: [],
      instructions: [],
    });

    const recipe = await getRecipe(id);
    expect(recipe?.isPublic).toBe(false);
  });

  it("should call syncCreate after creating a recipe", async () => {
    await createRecipe({
      title: "Sync Test",
      servings: 1,
      ingredients: [],
      instructions: [],
    });

    expect(syncCreate).toHaveBeenCalledOnce();
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

  it("should return undefined for a non-existent id", async () => {
    const recipe = await getRecipe("non-existent-id");
    expect(recipe).toBeUndefined();
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
    expect(updated?.servings).toBe(2); // unchanged
  });

  it("should update updatedAt but not createdAt when updating", async () => {
    const id = await createRecipe({
      title: "Original",
      servings: 1,
      ingredients: [],
      instructions: [],
    });

    const original = await getRecipe(id);
    const originalCreatedAt = original!.createdAt.getTime();

    await new Promise((r) => setTimeout(r, 5));
    await updateRecipe(id, { title: "Updated" });

    const updated = await getRecipe(id);
    expect(updated?.createdAt.getTime()).toBe(originalCreatedAt);
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalCreatedAt);
  });

  it("should call syncUpdate after updating a recipe", async () => {
    const id = await createRecipe({
      title: "Original",
      servings: 1,
      ingredients: [],
      instructions: [],
    });
    vi.clearAllMocks();

    await updateRecipe(id, { title: "Updated" });
    expect(syncUpdate).toHaveBeenCalledOnce();
    expect(syncUpdate).toHaveBeenCalledWith(
      id,
      expect.objectContaining({
        title: "Updated",
        updatedAt: expect.any(Date),
      }),
    );
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

  it("should leave the uploaded image alone so the delete stays undoable", async () => {
    const id = await createRecipe({
      title: "With Image",
      servings: 1,
      ingredients: [],
      instructions: [],
      imageFileId: "file_abc123",
    });

    await deleteRecipe(id);

    expect(deleteImage).not.toHaveBeenCalled();
  });

  it("should return the deleted recipe so the caller can restore it", async () => {
    const id = await createRecipe({
      title: "To Delete",
      servings: 3,
      ingredients: [],
      instructions: [],
    });

    const deleted = await deleteRecipe(id);

    expect(deleted).toEqual(
      expect.objectContaining({ id, title: "To Delete" }),
    );
  });

  it("should return undefined when the recipe is already gone", async () => {
    const deleted = await deleteRecipe("missing-id");

    expect(deleted).toBeUndefined();
  });

  it("should discard the image only when explicitly asked", async () => {
    const id = await createRecipe({
      title: "With Image",
      servings: 1,
      ingredients: [],
      instructions: [],
      imageFileId: "file_abc123",
    });
    const deleted = await deleteRecipe(id);
    if (!deleted) throw new Error("expected deleteRecipe to return the row");

    await discardRecipeImage(deleted);

    expect(deleteImage).toHaveBeenCalledOnce();
    expect(deleteImage).toHaveBeenCalledWith("file_abc123");
  });

  it("should not discard an image for a recipe that never had one", async () => {
    const id = await createRecipe({
      title: "No Image",
      servings: 1,
      ingredients: [],
      instructions: [],
    });
    const deleted = await deleteRecipe(id);
    if (!deleted) throw new Error("expected deleteRecipe to return the row");

    await discardRecipeImage(deleted);

    expect(deleteImage).not.toHaveBeenCalled();
  });

  it("should restore a deleted recipe with its id and image intact", async () => {
    const id = await createRecipe({
      title: "Restore Me",
      servings: 2,
      ingredients: [],
      instructions: [],
      imageFileId: "file_abc123",
    });
    const deleted = await deleteRecipe(id);
    if (!deleted) throw new Error("expected deleteRecipe to return the row");
    vi.clearAllMocks();

    await restoreRecipe(deleted);

    const restored = await getRecipe(id);
    expect(restored).toEqual(deleted);
    expect(syncCreate).toHaveBeenCalledWith(deleted);
  });

  it("should call syncDelete after deleting a recipe", async () => {
    const id = await createRecipe({
      title: "To Delete",
      servings: 1,
      ingredients: [],
      instructions: [],
    });
    vi.clearAllMocks();

    await deleteRecipe(id);
    expect(syncDelete).toHaveBeenCalledOnce();
    expect(syncDelete).toHaveBeenCalledWith(id);
  });
});
