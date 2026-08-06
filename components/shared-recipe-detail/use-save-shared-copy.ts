"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { createRecipe } from "@/lib/db/recipes";
import { clonePublicRecipe } from "@/lib/public-recipes/clone";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { trackEvent } from "@/lib/telemetry";

/**
 * Saves someone else's shared recipe as a local copy.
 *
 * Extracted from the view so the failure path is directly assertable: the
 * re-throw below only reaches Sentry as an *unhandled* rejection, which a test
 * driving it through a click handler cannot observe without leaking that
 * rejection into the whole test run.
 */
export function useSaveSharedCopy(recipe: PublicRecipe) {
  const t = useTranslations("recipes");
  const [saving, setSaving] = useState(false);

  async function saveCopy(onSaved: (recipeId: string) => void) {
    setSaving(true);
    // Emitted before the write, not after: a save that hangs — neither
    // resolving nor rejecting — is only visible as a `started` with no
    // matching outcome. That is the shape of "saving a shared recipe was
    // broken for a while, then fixed itself".
    trackEvent("shared_recipe_save_started");
    const startedAt = Date.now();
    try {
      const id = await createRecipe(clonePublicRecipe(recipe));
      trackEvent("shared_recipe_save_succeeded", {
        duration_ms: Date.now() - startedAt,
      });
      toast.success(t("savedShared"));
      onSaved(id);
    } catch (caughtError) {
      trackEvent("shared_recipe_save_failed");
      toast.error(t("saveSharedFailed"));
      setSaving(false);
      // Re-throw so Sentry's global unhandledrejection handler gets the real
      // cause — the project standard. The bare `catch {}` this replaces meant
      // a failed save produced a toast and nothing else, anywhere.
      throw caughtError;
    }
  }

  return { saving, saveCopy };
}
