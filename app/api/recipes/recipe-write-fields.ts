import type { Recipe } from "@/lib/db/schema";

const RECIPE_CONTENT_FIELDS = [
  "title",
  "description",
  "imageUrl",
  "imageFileId",
  "imageFocusX",
  "imageFocusY",
  "imageCropX",
  "imageCropY",
  "imageCropWidth",
  "imageCropHeight",
  "prepTime",
  "cookTime",
  "totalTime",
  "servings",
  "ingredients",
  "instructions",
  "sourceUrl",
  "category",
  "status",
  "collectionIds",
  "canonicalIngredientIds",
  "unrecognizedIngredients",
] as const satisfies readonly (keyof Recipe)[];

type RequiredRecipeContent = Pick<
  Recipe,
  "title" | "servings" | "ingredients" | "instructions"
> &
  Partial<Recipe>;

export function pickRecipeContent(input: Recipe): RequiredRecipeContent;
export function pickRecipeContent(input: Partial<Recipe>): Partial<Recipe>;
export function pickRecipeContent(input: Partial<Recipe>): Partial<Recipe> {
  return Object.fromEntries(
    RECIPE_CONTENT_FIELDS.flatMap((field) =>
      input[field] === undefined ? [] : [[field, input[field]]],
    ),
  ) as Partial<Recipe>;
}
