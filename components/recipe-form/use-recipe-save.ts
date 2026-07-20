"use client";

import { useRef, useState } from "react";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import {
  clearPendingUploadToken,
  getPendingUploadToken,
} from "@/lib/parse-job-storage";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { useHaptics } from "@/lib/platform";
import { captureError, trackEvent } from "@/lib/telemetry";
import { useNavigate } from "@/lib/transitions";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/upload/images";
import { generateId } from "@/lib/utils";
import type { RecipeOutput } from "./schema";

export type SaveState = "idle" | "saving" | "saved";

export function useRecipeSave(recipe?: Recipe) {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingImageFile = useRef<File | null>(null);
  const pendingStepFiles = useRef<Record<string, File>>({});

  const onSubmit = async (data: RecipeOutput) => {
    setImageError(null);
    setSaveState("saving");

    const totalTime = (data.prepTime || 0) + (data.cookTime || 0) || undefined;

    const instructionRows = (data.instructions || [])
      .map((instruction) => {
        const { rowId, sectionId, ...instructionData } = instruction;
        const id = rowId ?? generateId();
        return {
          stepId: id,
          id,
          ...instructionData,
          imageUrl: instructionData.imageUrl || undefined,
          ...(sectionId ? { sectionId } : {}),
        };
      })
      .filter((instruction) => instruction.instruction.trim().length > 0);
    const instructions = instructionRows.map(
      ({ stepId: _, ...instruction }, index) => ({
        ...instruction,
        order: index + 1,
      }),
    );
    const referencedSectionIds = new Set(
      [...data.ingredients, ...instructions]
        .map((item) => item.sectionId)
        .filter((sectionId): sectionId is string => Boolean(sectionId)),
    );
    const sections = data.sections
      .filter((section) => referencedSectionIds.has(section.id))
      .map((section, order) => ({ ...section, order }));

    const recipeData = {
      ...data,
      imageUrl: data.imageUrl || "",
      imageFileId: recipe?.imageFileId,
      totalTime,
      sections,
      ingredients: data.ingredients.map((ingredient) => {
        const { rowId, modifiers, sectionId, original, ...ingredientData } =
          ingredient;
        return {
          id: rowId ?? generateId(),
          ...(modifiers?.length ? { modifiers } : {}),
          ...(sectionId ? { sectionId } : {}),
          ...(original ? { original } : {}),
          ...ingredientData,
        };
      }),
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
      trackEvent("recipe_saved", { source: recipe ? "edit" : "parse" });
      normalizeRecipeIngredients(
        savedId,
        recipeData.ingredients.map((ingredient) => ({ item: ingredient.item })),
      )
        .then((counts) => {
          trackEvent("ingredients_normalized", counts);
        })
        .catch((caughtError) => {
          captureError(caughtError);
        });
    } catch {
      haptics.notify("error");
      setSaveState("idle");
      setImageError("Failed to save recipe");
      return;
    }

    haptics.notify("success");
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
        const stepId = instructionRows[stepIndex]?.stepId;
        const stepFile = stepId ? pendingStepFiles.current[stepId] : undefined;
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
