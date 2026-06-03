import { deleteImage } from "../upload/images";
import { generateId } from "../utils";
import { db } from "./db";
import type { Recipe } from "./schema";
import { syncCreate, syncDelete, syncUpdate } from "./supabase-sync";

/**
 * Create a new recipe
 */
export async function createRecipe(
  recipe: Omit<Recipe, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const now = new Date();
  const id = generateId();

  const newRecipe: Recipe = {
    ...recipe,
    id,
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
 * Delete a recipe
 */
export async function deleteRecipe(id: string): Promise<void> {
  const recipe = await db.recipes.get(id);

  if (recipe?.imageFileId) {
    try {
      await deleteImage(recipe.imageFileId);
    } catch {
      // image already gone or failed — continue with recipe deletion
    }
  }

  await db.recipes.delete(id);
  syncDelete(id);
}
