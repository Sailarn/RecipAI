import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schema/recipes";
import type { RecipeIngredient, RecipeSection, Step } from "@/lib/db/schema";
import { findRecipeIdBySource } from "@/lib/parse-recipe/find-recipe-by-source";
import { stripTrackingParams } from "@/lib/parse-recipe/normalize-url";
import {
  buildSavedRecipeShape,
  type SavedRecipeShape,
} from "@/lib/parse-recipe/parsed-recipe-shape";
import { log } from "@/lib/telemetry";
import { uploadImageServer } from "@/lib/upload/imagekit";
import { isImageKitUrl } from "@/lib/upload/images";
import type { CreateRecipeInput, UpdateRecipeInput } from "./input";
import { getRecipe } from "./queries";
import type { RecipeRow, RecipeView } from "./view";

// Owner-scoped recipe writes for the AI connector. Devices pick the changes up
// on their next pull (server wins); a cleared `canonicalIngredientIds` makes
// the device re-run ingredient normalization for the new list.

type IngredientDraft = CreateRecipeInput["ingredients"][number] & {
  original?: string | null;
};
type StepDraft = CreateRecipeInput["instructions"][number] & {
  imageUrl?: string;
};

export function buildShape(
  ingredients: IngredientDraft[],
  steps: StepDraft[],
): SavedRecipeShape {
  return buildSavedRecipeShape({
    ingredients: ingredients.map((ingredient) => ({
      item: ingredient.item,
      amount: ingredient.amount,
      unit: ingredient.unit,
      modifiers: ingredient.modifiers,
      section: ingredient.section ?? null,
      original: ingredient.original ?? null,
    })),
    instructions: steps.map((step, index) => ({
      order: index + 1,
      instruction: step.instruction,
      imageUrl: step.imageUrl,
      section: step.section ?? null,
    })),
  });
}

/** An existing recipe's lists as drafts (section ids → names), for rebuilding. */
export function draftsFromRow(
  row: Pick<RecipeRow, "ingredients" | "instructions" | "sections">,
): {
  ingredients: IngredientDraft[];
  steps: StepDraft[];
} {
  const names = new Map(
    ((row.sections ?? []) as RecipeSection[]).map((section) => [
      section.id,
      section.name,
    ]),
  );
  const sectionName = (id: string | null | undefined) =>
    (id && names.get(id)) || undefined;

  return {
    ingredients: ((row.ingredients ?? []) as RecipeIngredient[]).map(
      (ingredient) => ({
        item: ingredient.item,
        amount: ingredient.amount,
        unit: ingredient.unit,
        modifiers: ingredient.modifiers,
        section: sectionName(ingredient.sectionId),
        original: ingredient.original,
      }),
    ),
    steps: [...((row.instructions ?? []) as Step[])]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        instruction: step.instruction,
        imageUrl: step.imageUrl,
        section: sectionName(step.sectionId),
      })),
  };
}

/**
 * Only fetch images from public https hosts named by DNS: the URL comes from a
 * model, and the server fetching it must not be pointed at internal addresses.
 */
export function isFetchableImageUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[")) {
    return false;
  }
  return host.includes(".");
}

/** Copy an image into ImageKit; the recipe is still saved without it on failure. */
async function storeImage(
  imageUrl: string | undefined,
): Promise<{ imageUrl?: string; imageFileId?: string }> {
  if (!imageUrl) return {};
  if (isImageKitUrl(imageUrl)) return { imageUrl };
  if (!isFetchableImageUrl(imageUrl)) return {};
  try {
    const uploaded = await uploadImageServer(imageUrl);
    return { imageUrl: uploaded.url, imageFileId: uploaded.fileId };
  } catch (error) {
    log("warn", "mcp_image_upload_failed", {
      host: new URL(imageUrl).host,
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

function totalMinutes(
  prep: number | null | undefined,
  cook: number | null | undefined,
): number | null {
  return (prep ?? 0) + (cook ?? 0) || null;
}

export interface CreateRecipeResult {
  recipe: RecipeView;
  /** The source URL was already in the library; nothing new was written. */
  alreadySaved: boolean;
  /** Things the caller asked for that didn't happen, for the model to relay. */
  warnings?: string[];
}

export const IMAGE_NOT_SAVED_WARNING =
  "The photo could not be copied (the link must be a public https image), so the recipe has no photo. Try another image link with update_recipe.";

/** Column values that reset the hero image and its crop/focus settings. */
function imageColumns(image: { imageUrl?: string; imageFileId?: string }) {
  return {
    imageUrl: image.imageUrl ?? null,
    imageFileId: image.imageFileId ?? null,
    imageFocusX: null,
    imageFocusY: null,
    imageCropX: null,
    imageCropY: null,
    imageCropWidth: null,
    imageCropHeight: null,
  };
}

export async function createRecipe(
  userId: string,
  input: CreateRecipeInput,
  origin: string,
): Promise<CreateRecipeResult> {
  const sourceUrl = input.sourceUrl
    ? stripTrackingParams(input.sourceUrl)
    : undefined;
  if (sourceUrl) {
    const existingId = await findRecipeIdBySource(userId, sourceUrl);
    const existing =
      existingId && (await getRecipe(userId, existingId, origin));
    if (existing) return { recipe: existing, alreadySaved: true };
  }

  const shape = buildShape(input.ingredients, input.instructions);
  const image = await storeImage(input.imageUrl);
  const id = crypto.randomUUID();
  const now = new Date();

  await db.insert(recipes).values({
    id,
    userId,
    title: input.title,
    description: input.description ?? null,
    imageUrl: image.imageUrl ?? null,
    imageFileId: image.imageFileId ?? null,
    prepTime: input.prepTimeMinutes ?? null,
    cookTime: input.cookTimeMinutes ?? null,
    totalTime: totalMinutes(input.prepTimeMinutes, input.cookTimeMinutes),
    servings: input.servings ?? null,
    ingredients: shape.ingredients,
    instructions: shape.instructions,
    sections: shape.sections,
    sourceUrl: sourceUrl ?? null,
    category: input.category ?? null,
    isPublic: false,
    createdAt: now,
    updatedAt: now,
  });

  const recipe = await getRecipe(userId, id, origin);
  if (!recipe) throw new Error("created recipe could not be read back");
  return {
    recipe,
    alreadySaved: false,
    ...(input.imageUrl && !image.imageUrl
      ? { warnings: [IMAGE_NOT_SAVED_WARNING] }
      : {}),
  };
}

/** The column updates for a patch against the existing row. Pure. */
export function buildRecipeUpdate(
  existing: RecipeRow,
  patch: UpdateRecipeInput,
  now: Date = new Date(),
): Partial<typeof recipes.$inferInsert> {
  const set: Partial<typeof recipes.$inferInsert> = { updatedAt: now };

  if (patch.title !== undefined) set.title = patch.title;
  if (patch.description !== undefined) set.description = patch.description;
  if (patch.servings !== undefined) set.servings = patch.servings;
  if (patch.category !== undefined) set.category = patch.category;
  if (patch.sourceUrl !== undefined) {
    set.sourceUrl = patch.sourceUrl && stripTrackingParams(patch.sourceUrl);
  }
  if (patch.tried !== undefined) set.status = patch.tried ? "tried" : null;

  if (
    patch.prepTimeMinutes !== undefined ||
    patch.cookTimeMinutes !== undefined
  ) {
    const prep =
      patch.prepTimeMinutes !== undefined
        ? patch.prepTimeMinutes
        : existing.prepTime;
    const cook =
      patch.cookTimeMinutes !== undefined
        ? patch.cookTimeMinutes
        : existing.cookTime;
    set.prepTime = prep;
    set.cookTime = cook;
    set.totalTime = totalMinutes(prep, cook);
  }

  if (patch.ingredients || patch.instructions) {
    const drafts = draftsFromRow(existing);
    const shape = buildShape(
      patch.ingredients ?? drafts.ingredients,
      patch.instructions ?? drafts.steps,
    );
    set.ingredients = shape.ingredients;
    set.instructions = shape.instructions;
    set.sections = shape.sections;
    if (patch.ingredients) {
      // The device re-normalizes against the vocabulary after its next pull.
      set.canonicalIngredientIds = null;
      set.unrecognizedIngredients = null;
    }
  }

  return set;
}

async function findOwnRow(
  userId: string,
  id: string,
): Promise<RecipeRow | undefined> {
  const [row] = await db
    .select()
    .from(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .limit(1);
  return row;
}

export interface UpdateRecipeResult {
  recipe: RecipeView;
  warnings?: string[];
}

export async function updateRecipe(
  userId: string,
  id: string,
  patch: UpdateRecipeInput,
  origin: string,
): Promise<UpdateRecipeResult | null> {
  const existing = await findOwnRow(userId, id);
  if (!existing) return null;

  const set = buildRecipeUpdate(existing, patch);
  const warnings: string[] = [];
  if (patch.imageUrl === null) {
    Object.assign(set, imageColumns({}));
  } else if (patch.imageUrl !== undefined) {
    const image = await storeImage(patch.imageUrl);
    if (image.imageUrl) Object.assign(set, imageColumns(image));
    else
      warnings.push(
        IMAGE_NOT_SAVED_WARNING.replace(
          "so the recipe has no photo",
          "so the old photo was kept",
        ),
      );
  }

  await db
    .update(recipes)
    .set(set)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)));

  const recipe = await getRecipe(userId, id, origin);
  if (!recipe) return null;
  return { recipe, ...(warnings.length ? { warnings } : {}) };
}

/**
 * Delete one of the user's recipes. Its stored image is left in place: parse
 * results share images across users, and the app's own delete flow owns the
 * reference check before discarding one.
 */
export async function deleteRecipe(
  userId: string,
  id: string,
): Promise<{ id: string; title: string } | null> {
  const [deleted] = await db
    .delete(recipes)
    .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
    .returning({ id: recipes.id, title: recipes.title });
  return deleted ?? null;
}
