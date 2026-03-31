import { z } from "zod";

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
          item: z.string().min(1, t("ingredientNameRequired")),
          amount: z
            .string()
            .min(1, t("amountRequired"))
            .transform((val) => parseFloat(val))
            .refine((val) => !Number.isNaN(val) && val > 0, {
              message: t("amountRequired"),
            }),
          unit: z.string().optional(),
        }),
      )
      .min(1)
      .refine(
        (ingredients) => ingredients.some((ing) => ing.item.trim().length > 0),
        { message: t("ingredientsRequired") },
      ),
    instructions: z
      .array(z.object({ instruction: z.string() }))
      .transform((val) =>
        val.filter((inst) => inst.instruction.trim().length > 0),
      )
      .optional(),
    sourceUrl: z.string().url().or(z.literal("")).optional(),
    category: z.string().optional(),
  });
}

const dummySchema = createRecipeSchema(() => "");
export type RecipeFormData = z.input<typeof dummySchema>;
export type RecipeOutput = z.output<typeof dummySchema>;
