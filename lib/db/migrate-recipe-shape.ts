import {
  buildSectionsFromLabels,
  sectionIdForLabel,
} from "@/lib/parse-recipe/build-sections";
import {
  isPreparationModifier,
  type PreparationModifier,
} from "@/lib/parse-recipe/modifiers";
import { db } from "./db";
import { updateRecipe } from "./recipes";
import type { Recipe, RecipeIngredient, Step } from "./schema";

// Recipes saved before this migration used a single `modifier` key and a
// free-form `section` string directly on each ingredient/step. Dexie doesn't
// enforce the current TS type at runtime, so an older row can still carry
// those fields even though `RecipeIngredient`/`Step` no longer declare them —
// read them back via an untyped escape hatch.
type LegacyRecord = Record<string, unknown>;

function hasLegacyShape(recipe: Recipe): boolean {
  if (recipe.sections !== undefined) return false;
  const legacyIngredient = recipe.ingredients.some((ingredient) => {
    const raw = ingredient as unknown as LegacyRecord;
    return typeof raw.modifier === "string" || typeof raw.section === "string";
  });
  const legacyStep = recipe.instructions.some((step) => {
    const raw = step as unknown as LegacyRecord;
    return typeof raw.section === "string";
  });
  return legacyIngredient || legacyStep;
}

function migratedIngredient(
  ingredient: RecipeIngredient,
  sectionIdByLabel: Map<string, string>,
): RecipeIngredient {
  const raw = ingredient as unknown as LegacyRecord;
  const { modifier: legacyModifier, section: _legacySection, ...rest } = raw;
  const modifiers = Array.isArray(raw.modifiers)
    ? (raw.modifiers as unknown[]).filter(
        (modifier): modifier is PreparationModifier =>
          typeof modifier === "string" && isPreparationModifier(modifier),
      )
    : typeof legacyModifier === "string" &&
        isPreparationModifier(legacyModifier)
      ? [legacyModifier]
      : [];

  return {
    ...(rest as unknown as RecipeIngredient),
    modifiers,
    sectionId: sectionIdForLabel(
      raw.section as string | null,
      sectionIdByLabel,
    ),
  };
}

function migratedStep(step: Step, sectionIdByLabel: Map<string, string>): Step {
  const raw = step as unknown as LegacyRecord;
  const { section: _legacySection, ...rest } = raw;

  return {
    ...(rest as unknown as Step),
    sectionId: sectionIdForLabel(
      raw.section as string | null,
      sectionIdByLabel,
    ),
  };
}

/**
 * One-time-per-recipe upgrade from the legacy single-`modifier`/string-`section`
 * shape to `modifiers[]` + structured `sections`/`sectionId`. Self-limiting: a
 * recipe with `sections` already defined (even an empty array, set by every
 * save going forward) is skipped, so this becomes a cheap no-op once every
 * local recipe has been touched once.
 */
export async function migrateLegacyRecipeShapes(): Promise<void> {
  const recipes = await db.recipes.toArray();

  for (const recipe of recipes) {
    if (!hasLegacyShape(recipe)) continue;

    const { sections, sectionIdByLabel } = buildSectionsFromLabels(
      recipe.ingredients.map(
        (ingredient) =>
          (ingredient as unknown as LegacyRecord).section as string | null,
      ),
      recipe.instructions.map(
        (step) => (step as unknown as LegacyRecord).section as string | null,
      ),
    );

    await updateRecipe(recipe.id, {
      sections,
      ingredients: recipe.ingredients.map((ingredient) =>
        migratedIngredient(ingredient, sectionIdByLabel),
      ),
      instructions: recipe.instructions.map((step) =>
        migratedStep(step, sectionIdByLabel),
      ),
    });
  }
}
