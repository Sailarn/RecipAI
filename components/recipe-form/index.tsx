"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { BasicInfo } from "./basic-info";
import { FormActions } from "./form-actions";
import { IngredientsSection } from "./ingredients-section";
import { InstructionsSection } from "./instructions-section";

// Create a function that returns schema with translations
function createRecipeSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t("titleRequired")),
    description: z.string().optional(),
    imageUrl: z.string().url(t("imageUrlInvalid")).or(z.literal("")).optional(),
    prepTime: z.number().int().positive().optional(),
    cookTime: z.number().int().positive().optional(),
    servings: z.number().int().positive(t("servingsRequired")),
    ingredients: z
      .array(
        z.object({
          item: z.string().min(1, t("ingredientNameRequired")),
          amount: z.number().positive().optional(),
          unit: z.string().optional(),
        }),
      )
      .min(1, t("ingredientsRequired")),
    instructions: z
      .array(
        z.object({
          instruction: z.string().min(1, t("instructionRequired")),
        }),
      )
      .min(1, t("instructionsRequired")),
  });
}

// Infer type from schema (using a dummy schema for type inference)
const dummySchema = createRecipeSchema(() => "");
export type RecipeFormData = z.infer<typeof dummySchema>;

interface RecipeFormProps {
  recipe?: Recipe;
}

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations("recipeForm");

  const recipeSchema = createRecipeSchema(t);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: recipe
      ? {
        title: recipe.title,
        description: recipe.description || "",
        imageUrl: recipe.imageUrl || "",
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
      }
      : {
        servings: 4,
        ingredients: [{ item: "", amount: undefined, unit: "" }],
        instructions: [{ instruction: "" }],
      },
  });

  const onSubmit = async (data: RecipeFormData) => {
    const totalTime = (data.prepTime || 0) + (data.cookTime || 0) || undefined;

    if (recipe) {
      // Update existing recipe
      await updateRecipe(recipe.id, {
        ...data,
        totalTime,
        ingredients: data.ingredients.map((ing) => ({
          id: crypto.randomUUID(),
          ...ing,
        })),
        instructions: data.instructions.map((inst, idx) => ({
          id: crypto.randomUUID(),
          order: idx + 1,
          instruction: inst.instruction,
        })),
      });
    } else {
      // Create new recipe
      await createRecipe({
        ...data,
        totalTime,
        ingredients: data.ingredients.map((ing) => ({
          id: crypto.randomUUID(),
          ...ing,
        })),
        instructions: data.instructions.map((inst, idx) => ({
          id: crypto.randomUUID(),
          order: idx + 1,
          instruction: inst.instruction,
        })),
      });
    }

    router.push(`/${locale}/recipes`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <BasicInfo register={register} errors={errors} />
      <IngredientsSection
        register={register}
        control={control}
        errors={errors}
      />
      <InstructionsSection
        register={register}
        control={control}
        errors={errors}
      />
      <FormActions isSubmitting={isSubmitting} isEdit={!!recipe} />
    </form>
  );
}
