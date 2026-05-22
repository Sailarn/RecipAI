"use client";

import { useRef, useState } from "react";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/images";
import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";
import { useNavigate } from "@/lib/transitions";
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

    const instructions = (data.instructions || []).map((inst, idx) => ({
      id: generateId(),
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
        id: generateId(),
        ...ing,
      })),
      instructions,
    };

    let savedId: string;
    try {
      if (recipe) {
        await updateRecipe(recipe.id, recipeData);
        savedId = recipe.id;
      } else {
        savedId = await createRecipe(recipeData);
        normalizeRecipeIngredients(
          savedId,
          recipeData.ingredients.map((ing) => ({ item: ing.item })),
        ).catch((err) => console.error("[normalize] top-level error:", err));
      }
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
      const updates: Partial<typeof recipeData> = {};
      let hasUpdates = false;

      const file = pendingImageFile.current;
      if (file) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(file);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {
          // silent
        }
      } else if (recipeData.imageUrl && !isImageKitUrl(recipeData.imageUrl)) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(recipeData.imageUrl);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {
          // silent
        }
      }

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

  return {
    imageError,
    saveState,
    pendingImageFile,
    pendingStepFiles,
    onSubmit,
  };
}
