"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  deleteRecipe,
  discardRecipeImage,
  restoreRecipe,
} from "@/lib/db/recipes";
import { trackEvent } from "@/lib/telemetry";

// Long enough to notice and reach for, short enough that the image cleanup
// isn't left hanging. Matches the toast's own lifetime.
const UNDO_WINDOW_MS = 6_000;

/**
 * Delete a recipe with a confirmation toast and a working undo.
 *
 * The row and its server copy go immediately (so the list updates at once),
 * but the recipe's uploaded image is only destroyed after the undo window
 * closes — ImageKit deletion is irreversible, so doing it eagerly would make
 * undo restore a recipe with a broken photo. The timer lives outside React, so
 * navigating away from the deleted recipe doesn't cancel the cleanup.
 */
export function useDeleteRecipe() {
  const t = useTranslations("recipes.delete");

  return useCallback(
    async (recipeId: string) => {
      const deleted = await deleteRecipe(recipeId);
      trackEvent("recipe_deleted", undefined);
      if (!deleted) return;

      let undone = false;
      const imageCleanup = setTimeout(() => {
        if (!undone) void discardRecipeImage(deleted);
      }, UNDO_WINDOW_MS);

      toast.success(t("deleted", { title: deleted.title }), {
        duration: UNDO_WINDOW_MS,
        action: {
          label: t("undo"),
          onClick: () => {
            undone = true;
            clearTimeout(imageCleanup);
            trackEvent("recipe_delete_undone", undefined);
            restoreRecipe(deleted).catch((caughtError) => {
              toast.error(t("undoFailed"));
              throw caughtError;
            });
          },
        },
      });
    },
    [t],
  );
}
