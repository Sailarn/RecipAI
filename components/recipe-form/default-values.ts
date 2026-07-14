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
  servings?: number;
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
      servings: String(recipe.servings),
      ingredients: recipe.ingredients.map((ing) => ({
        rowId: ing.id,
        item: ing.item,
        amount: ing.amount != null ? String(ing.amount) : "",
        unit: ing.unit || "",
        modifiers: ing.modifiers ?? [],
        sectionId: ing.sectionId ?? null,
        original: ing.original,
      })),
      instructions: recipe.instructions.map((inst) => ({
        rowId: inst.id,
        instruction: inst.instruction,
        imageUrl: inst.imageUrl || "",
        sectionId: inst.sectionId ?? null,
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
      servings: String(initialData.servings || 1),
      ingredients: initialData.ingredients?.length
        ? initialData.ingredients.map((ing) => ({
            rowId: generateId(),
            item: ing.item || "",
            amount: ing.amount != null ? String(ing.amount) : "",
            unit: ing.unit || "",
            modifiers: validModifiers(ing.modifiers),
            sectionId:
              ing.sectionId ?? sectionIdForLabel(ing.section, sectionIdByLabel),
            original: ing.original ?? undefined,
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
        ? initialData.instructions.map((inst) => ({
            rowId: generateId(),
            instruction: inst.instruction || "",
            imageUrl: inst.imageUrl || "",
            sectionId:
              inst.sectionId ??
              sectionIdForLabel(inst.section, sectionIdByLabel),
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
