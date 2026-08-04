import type { Control } from "react-hook-form";
import { z } from "zod";
import {
  PREPARATION_MODIFIERS,
  type PreparationModifier,
} from "@/lib/parse-recipe/modifiers";

const preparationModifierSchema = z.enum(
  Object.keys(PREPARATION_MODIFIERS) as [
    PreparationModifier,
    ...PreparationModifier[],
  ],
);

const recipeSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number().int().nonnegative(),
});

export function createRecipeSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t("titleRequired")),
    description: z.string().optional(),
    imageUrl: z.string().url(t("imageUrlInvalid")).or(z.literal("")).optional(),
    prepTime: z.number().positive().optional(),
    cookTime: z.number().positive().optional(),
    servings: z
      .string()
      .min(1, t("servingsRequired"))
      .transform((val) => parseInt(val, 10))
      .refine((val) => !Number.isNaN(val) && val > 0 && Number.isInteger(val), {
        message: t("servingsRequired"),
      }),
    ingredients: z
      .array(
        z.object({
          rowId: z.string().optional(),
          item: z.string().min(1, t("ingredientNameRequired")),
          amount: z
            .string()
            .transform((value) => {
              const trimmedValue = value.trim();
              return trimmedValue === "" ? undefined : Number(trimmedValue);
            })
            .refine((value) => value === undefined || value > 0, {
              message: t("amountRequired"),
            }),
          unit: z.string().optional(),
          modifiers: z.array(preparationModifierSchema).optional(),
          sectionId: z.string().nullish(),
          original: z.string().nullish(),
        }),
      )
      .min(1)
      .refine(
        (ingredients) => ingredients.some((ing) => ing.item.trim().length > 0),
        { message: t("ingredientsRequired") },
      ),
    instructions: z
      .array(
        z.object({
          rowId: z.string().optional(),
          instruction: z.string(),
          imageUrl: z.string().optional(),
          sectionId: z.string().nullish(),
        }),
      )
      .transform((instructions) =>
        instructions.filter(
          (instruction) => instruction.instruction.trim().length > 0,
        ),
      )
      .optional(),
    sections: z.array(recipeSectionSchema).default([]),
    sourceUrl: z.string().url().or(z.literal("")).optional(),
    category: z.string().optional(),
    imageFocusX: z.number().min(0).max(100).nullish(),
    imageFocusY: z.number().min(0).max(100).nullish(),
    imageCropX: z.number().min(0).max(100).nullish(),
    imageCropY: z.number().min(0).max(100).nullish(),
    imageCropWidth: z.number().min(0).max(100).nullish(),
    imageCropHeight: z.number().min(0).max(100).nullish(),
  });
}

const dummySchema = createRecipeSchema(() => "");
export type RecipeFormData = z.input<typeof dummySchema>;
export type RecipeOutput = z.output<typeof dummySchema>;

/**
 * The form's `control`, with the transform generics spelled out.
 *
 * `useForm<RecipeFormData, unknown, RecipeOutput>` produces a three-generic
 * Control; a child typed as the defaulted `Control<RecipeFormData>` is a
 * genuinely different type and won't accept it. Sharing one alias keeps every
 * section in step with the form.
 */
export type RecipeFormControl = Control<RecipeFormData, unknown, RecipeOutput>;
