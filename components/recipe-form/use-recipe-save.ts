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
import { generateId } from "@/lib/utils";
import {
  resolveInstructionImages,
  resolveMainImage,
} from "./resolve-recipe-images";
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

    // Resolve every image to its final durable URL *before* writing the
    // recipe, so the save is a single write and the detail view never shows a
    // stale/blank photo waiting on a background patch that used to happen
    // after navigation with no loading indicator. saveState stays "saving"
    // (button disabled, "Saving...") for this whole duration.
    const uploadToken = getPendingUploadToken() ?? undefined;
    clearPendingUploadToken();
    const uploadOptions = uploadToken ? { uploadToken } : undefined;

    const mainImage = await resolveMainImage({
      pendingFile: pendingImageFile.current,
      currentImageUrl: data.imageUrl || "",
      previousImageFileId: recipe?.imageFileId,
      uploadOptions,
    });
    const {
      instructions: resolvedInstructions,
      uploadFailed: stepUploadFailed,
    } = await resolveInstructionImages({
      instructions,
      instructionRowIds: instructionRows.map((row) => row.stepId),
      pendingStepFiles: pendingStepFiles.current,
      uploadOptions,
    });

    const recipeData = {
      ...data,
      imageUrl: mainImage.imageUrl,
      imageFileId: mainImage.imageFileId,
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
      instructions: resolvedInstructions,
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

    // A failed photo upload keeps the user on this form (no auto-navigate) so
    // they can immediately retry — the pending file refs are untouched, and
    // the text/ingredient/step data is already durably saved either way.
    if (mainImage.uploadFailed || stepUploadFailed) {
      haptics.notify("error");
      setImageError(
        "Recipe saved, but a photo couldn't be uploaded — check your connection and save again to retry.",
      );
      setSaveState("idle");
      return;
    }

    haptics.notify("success");
    setSaveState("saved");

    setTimeout(() => {
      navigate.back();
    }, 600);
  };

  return {
    imageError,
    saveState,
    pendingImageFile,
    pendingStepFiles,
    onSubmit,
  };
}
