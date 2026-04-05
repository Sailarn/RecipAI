"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
  const pendingImageFile = useRef<File | null>(null);
  const pendingStepFiles = useRef<Record<number, File>>({});
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

    const totalTime = (data.prepTime || 0) + (data.cookTime || 0) || undefined;

    // build instructions without waiting for uploads
    const instructions = (data.instructions || []).map((inst, idx) => ({
      id: crypto.randomUUID(),
      order: idx + 1,
      instruction: inst.instruction,
      imageUrl: inst.imageUrl || undefined,
    }));

    const recipeData = {
      ...data,
      imageUrl: data.imageUrl || "",
      imageFileId: recipe?.imageFileId,
      totalTime,
      ingredients: data.ingredients.map((ing) => ({
        id: crypto.randomUUID(),
        ...ing,
      })),
      instructions,
    };

    let savedId: string;
    if (recipe) {
      await updateRecipe(recipe.id, recipeData);
      savedId = recipe.id;
    } else {
      savedId = await createRecipe(recipeData);
    }

    // navigate immediately
    navigate.push(routes.recipes.list(locale));

    // upload images in background after navigation
    (async () => {
      const updates: Partial<typeof recipeData> = {};
      let hasUpdates = false;

      // main image
      const file = pendingImageFile.current;
      if (file) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(file);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {}
      } else if (recipeData.imageUrl && !isImageKitUrl(recipeData.imageUrl)) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(recipeData.imageUrl);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {}
      }

      // step images
      const updatedInstructions = [];
      for (const inst of instructions) {
        const idx = inst.order - 1;
        const stepFile = pendingStepFiles.current[idx];
        if (stepFile) {
          try {
            const uploaded = await uploadImage(stepFile);
            hasUpdates = true;
            updatedInstructions.push({ ...inst, imageUrl: uploaded.url });
          } catch {
            updatedInstructions.push(inst);
          }
        } else if (inst.imageUrl && !isImageKitUrl(inst.imageUrl)) {
          try {
            const uploaded = await uploadImage(inst.imageUrl);
            hasUpdates = true;
            updatedInstructions.push({ ...inst, imageUrl: uploaded.url });
          } catch {
            updatedInstructions.push(inst);
          }
        } else {
          updatedInstructions.push(inst);
        }
      }

      if (hasUpdates) {
        updates.instructions = updatedInstructions;
        await updateRecipe(savedId, updates);
      }
    })();
  };

  return (
    <>
      {/* biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <BasicInfo
          register={register}
          control={control}
          errors={errors}
          onFileSelect={(file) => {
            pendingImageFile.current = file;
          }}
        />
        <IngredientsSection
          register={register}
          control={control}
          errors={errors}
        />
        <InstructionsSection
          register={register}
          control={control}
          errors={errors}
          onStepFileSelect={(index, file) => {
            if (file) pendingStepFiles.current[index] = file;
            else delete pendingStepFiles.current[index];
          }}
        />
        {imageError && (
          <Alert variant="destructive">
            <AlertDescription>{imageError}</AlertDescription>
          </Alert>
        )}
        <FormActions isSubmitting={isSubmitting} isEdit={!!recipe} />
      </form>
    </>
  );
}
