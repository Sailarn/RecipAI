import * as z from "zod";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import { PREPARATION_MODIFIERS } from "@/lib/parse-recipe/modifiers";

// Input shapes for recipes written by the AI connector. Limits keep one call
// from writing an unbounded document; they are generous for real recipes.

export const RECIPE_INPUT_LIMITS = {
  TITLE: 200,
  DESCRIPTION: 4000,
  ITEM: 300,
  UNIT: 40,
  SECTION: 100,
  INSTRUCTION: 4000,
  URL: 2000,
  MAX_INGREDIENTS: 150,
  MAX_STEPS: 100,
  MAX_MODIFIERS: 10,
  MAX_SERVINGS: 100,
  MAX_MINUTES: 7 * 24 * 60,
} as const;

const L = RECIPE_INPUT_LIMITS;

const modifierKeys = Object.keys(PREPARATION_MODIFIERS) as [
  keyof typeof PREPARATION_MODIFIERS,
  ...(keyof typeof PREPARATION_MODIFIERS)[],
];

const sectionSchema = z
  .string()
  .trim()
  .max(L.SECTION)
  .optional()
  .describe(
    'Section name, e.g. "For the dough". Items with the same name are grouped.',
  );

export const ingredientInputSchema = z.object({
  item: z
    .string()
    .trim()
    .min(1)
    .max(L.ITEM)
    .describe('Ingredient name without the quantity, e.g. "plain flour".'),
  amount: z
    .number()
    .positive()
    .max(100_000)
    .optional()
    .describe("Numeric quantity, e.g. 250 or 0.5."),
  unit: z
    .string()
    .trim()
    .max(L.UNIT)
    .optional()
    .describe('Unit, e.g. "g", "ml", "tbsp", "pcs".'),
  modifiers: z
    .array(z.enum(modifierKeys))
    .max(L.MAX_MODIFIERS)
    .optional()
    .describe("Preparation modifiers from the fixed list."),
  section: sectionSchema,
});

export const stepInputSchema = z.object({
  instruction: z.string().trim().min(1).max(L.INSTRUCTION),
  section: sectionSchema,
  imageUrl: z
    .string()
    .trim()
    .max(L.URL)
    .refine((value) => /^https:\/\//i.test(value) && URL.canParse(value), {
      message: "must be an https URL",
    })
    .optional()
    .describe("Optional photo for this step (public https image URL)."),
});

const httpUrl = z
  .string()
  .trim()
  .max(L.URL)
  .refine((value) => /^https?:\/\//i.test(value) && URL.canParse(value), {
    message: "must be an http(s) URL",
  });

const minutes = z.number().int().min(0).max(L.MAX_MINUTES);

export const createRecipeInputShape = {
  title: z.string().trim().min(1).max(L.TITLE),
  description: z.string().trim().max(L.DESCRIPTION).optional(),
  servings: z.number().int().min(1).max(L.MAX_SERVINGS).optional(),
  prepTimeMinutes: minutes.optional(),
  cookTimeMinutes: minutes.optional(),
  category: z.enum(RECIPE_CATEGORIES).optional(),
  sourceUrl: httpUrl
    .optional()
    .describe("Where the recipe came from, if anywhere."),
  imageUrl: httpUrl
    .optional()
    .describe("Optional photo URL; copied into RecipAI's image storage."),
  ingredients: z.array(ingredientInputSchema).min(1).max(L.MAX_INGREDIENTS),
  instructions: z.array(stepInputSchema).min(1).max(L.MAX_STEPS),
};

export const createRecipeInputSchema = z.object(createRecipeInputShape);
export type CreateRecipeInput = z.infer<typeof createRecipeInputSchema>;

/**
 * Partial update. Omitted fields are unchanged; `null` clears an optional
 * field. Passing `ingredients` or `instructions` replaces that whole list.
 */
export const updateRecipeInputShape = {
  title: createRecipeInputShape.title.optional(),
  description: z.string().trim().max(L.DESCRIPTION).nullable().optional(),
  servings: z.number().int().min(1).max(L.MAX_SERVINGS).nullable().optional(),
  prepTimeMinutes: minutes.nullable().optional(),
  cookTimeMinutes: minutes.nullable().optional(),
  category: z.enum(RECIPE_CATEGORIES).nullable().optional(),
  sourceUrl: httpUrl.nullable().optional(),
  imageUrl: httpUrl
    .nullable()
    .optional()
    .describe(
      "New main photo (public image URL, copied into RecipAI), or null to remove it.",
    ),
  tried: z
    .boolean()
    .optional()
    .describe("Mark the recipe as cooked (tried) or not."),
  ingredients: createRecipeInputShape.ingredients
    .optional()
    .describe("Replaces the whole ingredient list."),
  instructions: createRecipeInputShape.instructions
    .optional()
    .describe("Replaces the whole list of steps."),
};

export const updateRecipeInputSchema = z.object(updateRecipeInputShape);
export type UpdateRecipeInput = z.infer<typeof updateRecipeInputSchema>;

export const collectionNameSchema = z.string().trim().min(1).max(200);
export const collectionEmojiSchema = z.string().trim().min(1).max(10);
