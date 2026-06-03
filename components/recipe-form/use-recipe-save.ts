"use client";

import { useRef, useState } from "react";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import {
  clearPendingUploadToken,
  getPendingUploadToken,
} from "@/lib/parse-job-storage";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { useNavigate } from "@/lib/transitions";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/upload/images";
import { generateId } from "@/lib/utils";
import type { RecipeOutput } from "./schema";

export type SaveState = "idle" | "saving" | "saved";

export function useRecipeSave(recipe: Recipe | undefined) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingImageFile = useRef<File | null>(null);
  const pendingStepFiles = useRef<Record<number, File>>({});

  const onSubmit = async (data: RecipeOutput) => {
    setImageError(null);
    setSaveState("saving");

    const totalTime = (data.prepTime || 0) + (data.cookTime || 0) || undefined;

    const instructions = (data.instructions || []).map(
      (instruction, index) => ({
        id: generateId(),
        order: index + 1,
        instruction: instruction.instruction,
        imageUrl: instruction.imageUrl || undefined,
      }),
    );

    const recipeData = {
      ...data,
      imageUrl: data.imageUrl || "",
      imageFileId: recipe?.imageFileId,
      totalTime,
      ingredients: data.ingredients.map((ingredient) => ({
        id: generateId(),
        ...ingredient,
      })),
      instructions,
      imageFocusX: data.imageFocusX ?? undefined,
      imageFocusY: data.imageFocusY ?? undefined,
      imageCropX: data.imageCropX ?? undefined,
      imageCropY: data.imageCropY ?? undefined,
      imageCropWidth: data.imageCropWidth ?? undefined,
      imageCropHeight: data.imageCropHeight ?? undefined,
    };

    let savedId: string;
    try {
      if (recipe) {
        await updateRecipe(recipe.id, recipeData);
        savedId = recipe.id;
      } else {
        savedId = await createRecipe(recipeData);
      }
      normalizeRecipeIngredients(
        savedId,
        recipeData.ingredients.map((ingredient) => ({ item: ingredient.item })),
      ).catch(() => {});
    } catch {
      setSaveState("idle");
      setImageError("Failed to save recipe");
      return;
    }

    setSaveState("saved");

    setTimeout(() => {
      navigate.back();
    }, 600);

    // upload images in background after navigation
    (async () => {
      const uploadToken = getPendingUploadToken() ?? undefined;
      clearPendingUploadToken();

      const uploadOptions = uploadToken ? { uploadToken } : undefined;
      const updates: Partial<typeof recipeData> = {};
      let hasUpdates = false;

      const file = pendingImageFile.current;
      if (file) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(file, uploadOptions);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {
          // silent
        }
      } else if (recipeData.imageUrl && !isImageKitUrl(recipeData.imageUrl)) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(
            recipeData.imageUrl,
            uploadOptions,
          );
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {
          // silent
        }
      }

      const updatedInstructions = [];
      for (const instruction of instructions) {
        const stepIndex = instruction.order - 1;
        const stepFile = pendingStepFiles.current[stepIndex];
        if (stepFile) {
          try {
            const uploaded = await uploadImage(stepFile, uploadOptions);
            hasUpdates = true;
            updatedInstructions.push({
              ...instruction,
              imageUrl: uploaded.url,
            });
          } catch {
            updatedInstructions.push(instruction);
          }
        } else if (
          instruction.imageUrl &&
          !isImageKitUrl(instruction.imageUrl)
        ) {
          try {
            const uploaded = await uploadImage(
              instruction.imageUrl,
              uploadOptions,
            );
            hasUpdates = true;
            updatedInstructions.push({
              ...instruction,
              imageUrl: uploaded.url,
            });
          } catch {
            updatedInstructions.push(instruction);
          }
        } else {
          updatedInstructions.push(instruction);
        }
      }

      if (hasUpdates) {
        updates.instructions = updatedInstructions;
        await updateRecipe(savedId, updates);
      }
    })();
  };

  return {
    imageError,
    saveState,
    pendingImageFile,
    pendingStepFiles,
    onSubmit,
  };
}
