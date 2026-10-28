import type { Recipe, RecipeSection } from "@/lib/db/schema";
import {
  buildSectionsFromLabels,
  sectionIdForLabel,
} from "@/lib/parse-recipe/build-sections";
import {
  isPreparationModifier,
  type PreparationModifier,
} from "@/lib/parse-recipe/modifiers";
import { generateId } from "@/lib/utils";
import type { RecipeFormData } from "./schema";

interface ParsedRecipeData {
  title?: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number | null;
  cookTime?: number | null;
  servings?: number | null;
  ingredients?: Array<{
    item: string;
    amount?: number | null;
    unit?: string | null;
    // Display metadata carried through the parse → review → save flow.
    modifiers?: PreparationModifier[];
    sectionId?: string | null;
    section?: string | null;
    original?: string | null;
  }>;
  instructions?: Array<{
    instruction: string;
    order?: number;
    imageUrl?: string;
    sectionId?: string | null;
    section?: string | null;
  }>;
  sections?: RecipeSection[];
  sourceUrl?: string;
  category?: string;
}

function buildInitialSections(initialData: ParsedRecipeData) {
  if (initialData.sections?.length) {
    return {
      sections: initialData.sections,
      sectionIdByLabel: new Map(
        initialData.sections.map((section) => [section.name, section.id]),
      ),
    };
  }

  return buildSectionsFromLabels(
    initialData.ingredients?.map((ingredient) => ingredient.section) ?? [],
    initialData.instructions?.map((instruction) => instruction.section) ?? [],
  );
}

function validModifiers(modifiers: unknown): PreparationModifier[] {
  return Array.isArray(modifiers)
    ? modifiers.filter(isPreparationModifier)
    : [];
}

export function getDefaultValues(
  recipe?: Recipe,
  initialData?: ParsedRecipeData,
): RecipeFormData {
  if (recipe) {
    return {
      title: recipe.title,
      description: recipe.description || "",
      imageUrl: recipe.imageUrl || "",
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      servings: recipe.servings != null ? String(recipe.servings) : "",
      ingredients: recipe.ingredients.map((ingredient) => ({
        rowId: ingredient.id,
        item: ingredient.item,
        amount: ingredient.amount != null ? String(ingredient.amount) : "",
        unit: ingredient.unit || "",
        modifiers: ingredient.modifiers ?? [],
        sectionId: ingredient.sectionId ?? null,
        original: ingredient.original,
      })),
      instructions: recipe.instructions.map((instruction) => ({
        rowId: instruction.id,
        instruction: instruction.instruction,
        imageUrl: instruction.imageUrl || "",
        sectionId: instruction.sectionId ?? null,
      })),
      sections: recipe.sections ?? [],
      sourceUrl: recipe.sourceUrl || "",
      category: recipe.category || "",
      imageFocusX: recipe.imageFocusX ?? undefined,
      imageFocusY: recipe.imageFocusY ?? undefined,
      imageCropX: recipe.imageCropX ?? undefined,
      imageCropY: recipe.imageCropY ?? undefined,
      imageCropWidth: recipe.imageCropWidth ?? undefined,
      imageCropHeight: recipe.imageCropHeight ?? undefined,
    };
  }

  if (initialData) {
    const { sections, sectionIdByLabel } = buildInitialSections(initialData);

    return {
      title: initialData.title || "",
      description: initialData.description || "",
      imageUrl: initialData.imageUrl || "",
      prepTime: initialData.prepTime ?? undefined,
      cookTime: initialData.cookTime ?? undefined,
      servings: initialData.servings ? String(initialData.servings) : "",
      ingredients: initialData.ingredients?.length
        ? initialData.ingredients.map((ingredient) => ({
            rowId: generateId(),
            item: ingredient.item || "",
            amount: ingredient.amount != null ? String(ingredient.amount) : "",
            unit: ingredient.unit || "",
            modifiers: validModifiers(ingredient.modifiers),
            sectionId:
              ingredient.sectionId ??
              sectionIdForLabel(ingredient.section, sectionIdByLabel),
            original: ingredient.original ?? undefined,
          }))
        : [
            {
              rowId: generateId(),
              item: "",
              amount: "1",
              unit: "",
              modifiers: [],
              sectionId: null,
            },
          ],
      instructions: initialData.instructions?.length
        ? initialData.instructions.map((instruction) => ({
            rowId: generateId(),
            instruction: instruction.instruction || "",
            imageUrl: instruction.imageUrl || "",
            sectionId:
              instruction.sectionId ??
              sectionIdForLabel(instruction.section, sectionIdByLabel),
          }))
        : [
            {
              rowId: generateId(),
              instruction: "",
              imageUrl: "",
              sectionId: null,
            },
          ],
      sections,
      sourceUrl: initialData.sourceUrl || "",
      category: initialData.category || "",
    };
  }

  return {
    title: "",
    description: "",
    imageUrl: "",
    servings: "1",
    ingredients: [
      {
        rowId: generateId(),
        item: "",
        amount: "",
        unit: "",
        modifiers: [],
        sectionId: null,
      },
    ],
    instructions: [
      {
        rowId: generateId(),
        instruction: "",
        imageUrl: "",
        sectionId: null,
      },
    ],
    sections: [],
    sourceUrl: "",
    category: "",
  };
}

export type { ParsedRecipeData };
