"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
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

export function useRecipeSave(recipe: Recipe) {
  const t = useTranslations("recipeForm");
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
    const mainImage = await resolveMainImage({
      pendingFile: pendingImageFile.current,
      currentImageUrl: data.imageUrl || "",
      previousImageFileId: recipe.imageFileId,
    });
    const {
      instructions: resolvedInstructions,
      uploadFailed: stepUploadFailed,
    } = await resolveInstructionImages({
      instructions,
      instructionRowIds: instructionRows.map((row) => row.stepId),
      pendingStepFiles: pendingStepFiles.current,
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

    try {
      await updateRecipe(recipe.id, recipeData);
      trackEvent("recipe_saved", { source: "edit" });
      normalizeRecipeIngredients(
        recipe.id,
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
      setImageError(t("saveFailed"));
      return;
    }

    // A failed photo upload keeps the user on this form (no auto-navigate) so
    // they can immediately retry — the pending file refs are untouched, and
    // the text/ingredient/step data is already durably saved either way.
    if (mainImage.uploadFailed || stepUploadFailed) {
      haptics.notify("error");
      setImageError(t("photoUploadFailed"));
      setSaveState("idle");
      return;
    }

    haptics.notify("success");
    setSaveState("saved");
    // The toast is the confirmation now, so there is nothing left to linger
    // here for — the form used to hold a "Saved" button state for 600ms before
    // navigating, which just made every save feel slower than it was.
    toast.success(t("updated"));
    navigate.back();
  };

  return {
    imageError,
    saveState,
    pendingImageFile,
    pendingStepFiles,
    onSubmit,
  };
}
