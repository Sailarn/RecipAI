import { deleteImage } from "../upload/images";
import { generateId } from "../utils";
import { db } from "./db";
import type { Recipe } from "./schema";
import { syncCreate, syncDelete, syncUpdate } from "./supabase-sync";

export async function createRecipe(
  recipe: Omit<Recipe, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = new Date();
  const id = generateId();

  const newRecipe: Recipe = {
    ...recipe,
    id,
    isPublic: recipe.isPublic === true,
    createdAt: now,
    updatedAt: now,
  };

  await db.recipes.add(newRecipe);
  syncCreate(newRecipe); // fire-and-forget
  return id;
}

/**
 * Get a single recipe by ID
 */
export async function getRecipe(id: string): Promise<Recipe | undefined> {
  return await db.recipes.get(id);
}

/**
 * Get all recipes
 */
export async function getAllRecipes(): Promise<Recipe[]> {
  return await db.recipes.toArray();
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(
  id: string,
  updates: Partial<Omit<Recipe, "id" | "createdAt">>,
): Promise<void> {
  const now = new Date();
  await db.recipes.update(id, {
    ...updates,
    updatedAt: now,
  });
  syncUpdate(id, { ...updates, updatedAt: now });
}

/**
 * Delete a recipe locally and on the server, returning the row that was
 * removed so the caller can offer undo.
 *
 * The uploaded image is deliberately left alone — destroying it here would
 * make undo lossy, since ImageKit deletion can't be reversed. Callers own the
 * image: call `discardRecipeImage` once undo is no longer possible, or
 * `restoreRecipe` to put the recipe back with its photo intact.
 */
export async function deleteRecipe(id: string): Promise<Recipe | undefined> {
  const recipe = await db.recipes.get(id);

  await db.recipes.delete(id);
  syncDelete(id);

  return recipe;
}

/**
 * Destroy the uploaded image a deleted recipe owned. Irreversible — only call
 * once the recipe can no longer be restored.
 */
export async function discardRecipeImage(recipe: Recipe): Promise<void> {
  if (!recipe.imageFileId) return;

  try {
    await deleteImage(recipe.imageFileId);
  } catch {
    // image already gone or the request failed — nothing left to do
  }
}

/** Put back a recipe removed by `deleteRecipe`, id and image included. */
export async function restoreRecipe(recipe: Recipe): Promise<void> {
  await db.recipes.add(recipe);
  syncCreate(recipe);
}
