"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/images";
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
    prepTime: z.number().positive().optional(),
    cookTime: z.number().positive().optional(),

    servings: z
      .string()
      .min(1, t("servingsRequired"))
      .transform((val) => parseInt(val))
      .refine((val) => !isNaN(val) && val > 0 && Number.isInteger(val), {
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
            .refine((val) => !isNaN(val) && val > 0, {
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
      .array(
        z.object({
          instruction: z.string(),
        }),
      )
      .transform((val) =>
        val.filter((inst) => inst.instruction.trim().length > 0),
      )
      .optional(),
  });
}

// Infer types from schema
const dummySchema = createRecipeSchema(() => "");
export type RecipeFormData = z.input<typeof dummySchema>; // Form uses strings
type RecipeOutput = z.output<typeof dummySchema>; // After validation uses numbers

interface RecipeFormProps {
  recipe?: Recipe;
  initialData?: any;
}

export function RecipeForm({ recipe, initialData }: RecipeFormProps) {
  const router = useRouter();
  const params = useParams();
  const [imageError, setImageError] = useState<string | null>(null);
  const locale = params.locale as string;
  const t = useTranslations("recipeForm");

  const recipeSchema = createRecipeSchema(t);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema) as any,
    mode: "onSubmit",
    defaultValues: recipe
      ? {
          // Edit mode: existing recipe (convert numbers to strings)
          title: recipe.title,
          description: recipe.description || "",
          imageUrl: recipe.imageUrl || "/images/recipe-placeholder.png",
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: String(recipe.servings),
          ingredients: recipe.ingredients.map((ing) => ({
            item: ing.item,
            amount: String(ing.amount),
            unit: ing.unit || "",
          })),
          instructions: recipe.instructions.map((inst) => ({
            instruction: inst.instruction,
          })),
        }
      : initialData
        ? {
            // Parsed mode: AI-generated recipe
            title: initialData.title || "",
            description: initialData.description || "",
            imageUrl: initialData.imageUrl || "",
            prepTime: initialData.prepTime,
            cookTime: initialData.cookTime,
            servings: String(initialData.servings || 1),
            ingredients: initialData.ingredients?.length
              ? initialData.ingredients.map((ing: any) => ({
                  item: ing.item || "",
                  amount: String(ing.amount || 1),
                  unit: ing.unit || "",
                }))
              : [{ item: "", amount: "1", unit: "" }],
            instructions: initialData.instructions?.length
              ? initialData.instructions.map((inst: any) => ({
                  instruction: inst.instruction || "",
                }))
              : [{ instruction: "" }],
          }
        : {
            // Create mode: empty form
            title: "",
            description: "",
            imageUrl: "",
            servings: "1",
            ingredients: [{ item: "", amount: "1", unit: "" }],
            instructions: [{ instruction: "" }],
          },
  });

  const onSubmit = async (data: RecipeOutput) => {
    setImageError(null);

    let imageUrl = data.imageUrl || "";
    let imageFileId = recipe?.imageFileId;

    // Upload gate — if image URL exists and is not already on ImageKit
    if (imageUrl && !isImageKitUrl(imageUrl)) {
      try {
        // If editing and had a previous ImageKit image, delete it first
        if (recipe?.imageFileId) {
          await deleteImage(recipe.imageFileId);
        }
        const uploaded = await uploadImage(imageUrl);
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;
      } catch (err) {
        setImageError(
          err instanceof Error ? err.message : t("imageUploadFailed"),
        );
        return; // Block save
      }
    }

    const totalTime = (data.prepTime || 0) + (data.cookTime || 0) || undefined;

    const recipeData = {
      ...data,
      imageUrl,
      imageFileId,
      totalTime,
      ingredients: data.ingredients.map((ing) => ({
        id: crypto.randomUUID(),
        ...ing,
      })),
      instructions: (data.instructions || []).map((inst, idx) => ({
        id: crypto.randomUUID(),
        order: idx + 1,
        instruction: inst.instruction,
      })),
    };

    if (recipe) {
      await updateRecipe(recipe.id, recipeData);
    } else {
      await createRecipe(recipeData);
    }

    router.push(`/${locale}/recipes`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
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
      {imageError && (
        <p className="text-sm" style={{ color: "var(--destructive)" }}>
          {imageError}
        </p>
      )}
      <FormActions isSubmitting={isSubmitting} isEdit={!!recipe} />
    </form>
  );
}
