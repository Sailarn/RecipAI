import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { recipes } from "@/db/schema/recipes";
import type { RecipeIngredient, Step } from "@/lib/db/schema";
import type { PublicRecipe } from "./types";

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeIngredient(
  value: unknown,
  index: number,
): RecipeIngredient | null {
  // Persisted ingredients don't always carry an `id` (older/parsed rows omit
  // it), so synthesize a stable one rather than dropping the whole item — the
  // id is only a render key here and is regenerated on save (clonePublicRecipe).
  if (!isJsonRecord(value) || typeof value.item !== "string") {
    return null;
  }

  const ingredient: RecipeIngredient = {
    id: typeof value.id === "string" ? value.id : `ing-${index}`,
    item: value.item,
  };

  if (isFiniteNumber(value.amount) && value.amount > 0) {
    ingredient.amount = value.amount;
  }
  if (typeof value.unit === "string") {
    ingredient.unit = value.unit;
  }

  return ingredient;
}

function sanitizeStep(value: unknown, index: number): Step | null {
  // Same as ingredients: tolerate a missing `id` by synthesizing one instead of
  // dropping the step. `order` and `instruction` remain required.
  if (
    !isJsonRecord(value) ||
    !isFiniteNumber(value.order) ||
    typeof value.instruction !== "string"
  ) {
    return null;
  }

  const step: Step = {
    id: typeof value.id === "string" ? value.id : `step-${index}`,
    order: value.order,
    instruction: value.instruction,
  };

  if (typeof value.imageUrl === "string") {
    step.imageUrl = value.imageUrl;
  }

  return step;
}

function sanitizeJsonArray<T>(
  value: unknown,
  sanitizeItem: (item: unknown, index: number) => T | null,
): T[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => sanitizeItem(item, index))
    .filter((item): item is T => item !== null);
}

function sanitizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

// Wrapped in React cache() so generateMetadata and the page body share a
// single DB query per request instead of querying twice.
export const getPublicRecipe = cache(
  async (recipeId: string): Promise<PublicRecipe | null> => {
    const [row] = await db
      .select({
        id: recipes.id,
        title: recipes.title,
        description: recipes.description,
        imageUrl: recipes.imageUrl,
        imageFocusX: recipes.imageFocusX,
        imageFocusY: recipes.imageFocusY,
        imageCropX: recipes.imageCropX,
        imageCropY: recipes.imageCropY,
        imageCropWidth: recipes.imageCropWidth,
        imageCropHeight: recipes.imageCropHeight,
        prepTime: recipes.prepTime,
        cookTime: recipes.cookTime,
        totalTime: recipes.totalTime,
        servings: recipes.servings,
        ingredients: recipes.ingredients,
        instructions: recipes.instructions,
        sourceUrl: recipes.sourceUrl,
        category: recipes.category,
        canonicalIngredientIds: recipes.canonicalIngredientIds,
        ownerName: user.name,
        ownerImage: user.image,
      })
      .from(recipes)
      .innerJoin(user, eq(recipes.userId, user.id))
      .where(and(eq(recipes.id, recipeId), eq(recipes.isPublic, true)))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      imageFocusX: row.imageFocusX ?? undefined,
      imageFocusY: row.imageFocusY ?? undefined,
      imageCropX: row.imageCropX ?? undefined,
      imageCropY: row.imageCropY ?? undefined,
      imageCropWidth: row.imageCropWidth ?? undefined,
      imageCropHeight: row.imageCropHeight ?? undefined,
      prepTime: row.prepTime ?? undefined,
      cookTime: row.cookTime ?? undefined,
      totalTime: row.totalTime ?? undefined,
      servings: row.servings,
      ingredients: sanitizeJsonArray(row.ingredients, sanitizeIngredient),
      instructions: sanitizeJsonArray(row.instructions, sanitizeStep),
      sourceUrl: row.sourceUrl ?? undefined,
      category: row.category ?? undefined,
      canonicalIngredientIds: sanitizeStringArray(row.canonicalIngredientIds),
      owner: {
        name: row.ownerName,
        image: row.ownerImage ?? undefined,
      },
    };
  },
);
