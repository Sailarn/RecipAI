"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/images";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { BasicInfo } from "./basic-info";
import { getDefaultValues, type ParsedRecipeData } from "./default-values";
import { FormActions } from "./form-actions";
import { IngredientsSection } from "./ingredients-section";
import { InstructionsSection } from "./instructions-section";
import {
  createRecipeSchema,
  type RecipeFormData,
  type RecipeOutput,
} from "./schema";

interface RecipeFormProps {
  recipe?: Recipe;
  initialData?: ParsedRecipeData;
}

export function RecipeForm({ recipe, initialData }: RecipeFormProps) {
  const navigate = useNavigate();
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
    // biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms
    resolver: zodResolver(recipeSchema) as any,
    mode: "onSubmit",
    defaultValues: getDefaultValues(recipe, initialData),
  });

  const onSubmit = async (data: RecipeOutput) => {
    setImageError(null);

    let imageUrl = data.imageUrl || "";
    let imageFileId = recipe?.imageFileId;

    if (imageUrl && !isImageKitUrl(imageUrl)) {
      try {
        if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
        const uploaded = await uploadImage(imageUrl);
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;
      } catch (err) {
        setImageError(
          err instanceof Error ? err.message : t("imageUploadFailed"),
        );
        return;
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

    navigate.push(routes.recipes.list(locale));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
      <BasicInfo register={register} control={control} errors={errors} />
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
        <Alert variant="destructive">
          <AlertDescription>{imageError}</AlertDescription>
        </Alert>
      )}
      <FormActions isSubmitting={isSubmitting} isEdit={!!recipe} />
    </form>
  );
}
