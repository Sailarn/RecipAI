import type {
  ParsedIngredient,
  RecipeIngredient,
  RecipeSection,
  Step,
} from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import { buildSectionsFromLabels, sectionIdForLabel } from "./build-sections";
import { isPreparationModifier } from "./modifiers";

interface ParsedStep {
  order: number;
  instruction: string;
  imageUrl?: string;
  section?: string | null;
}

interface ParsedRecipeShapeInput {
  ingredients: ParsedIngredient[];
  instructions: ParsedStep[];
}

export interface SavedRecipeShape {
  sections: RecipeSection[];
  ingredients: RecipeIngredient[];
  instructions: Step[];
}

export function buildSavedRecipeShape(
  parsed: ParsedRecipeShapeInput,
  nextId: () => string = generateId,
): SavedRecipeShape {
  const { sections, sectionIdByLabel } = buildSectionsFromLabels(
    parsed.ingredients.map((ingredient) => ingredient.section),
    parsed.instructions.map((instruction) => instruction.section),
    nextId,
  );

  return {
    sections,
    ingredients: parsed.ingredients.map((ingredient) => ({
      id: nextId(),
      item: ingredient.item,
      amount: ingredient.amount,
      unit: ingredient.unit,
      modifiers: (ingredient.modifiers ?? []).filter(isPreparationModifier),
      sectionId: sectionIdForLabel(ingredient.section, sectionIdByLabel),
      ...(ingredient.original && ingredient.original !== ingredient.item
        ? { original: ingredient.original }
        : {}),
    })),
    instructions: parsed.instructions.map((instruction, index) => ({
      id: nextId(),
      order: index + 1,
      instruction: instruction.instruction,
      imageUrl: instruction.imageUrl || undefined,
      sectionId: sectionIdForLabel(instruction.section, sectionIdByLabel),
    })),
  };
}
