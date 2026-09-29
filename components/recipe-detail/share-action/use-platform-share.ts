"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { usePlatform } from "@/lib/platform";
import type { RecipeShareInput } from "@/lib/platform/types";

function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Hands a recipe to the platform's native share (Web Share on the web, the
 * share-to-chat sheet in Telegram) and tells the user how it went.
 *
 * A failure is toasted, then re-thrown so it reaches Sentry's global
 * `unhandledrejection` handler (see CLAUDE.md). Swallowing it once left a dead
 * Telegram share on deep-link launches with no trace anywhere. The user
 * dismissing the share sheet is not a failure and is neither reported nor
 * re-thrown.
 */
export function usePlatformShare() {
  const t = useTranslations("recipes");
  const platform = usePlatform();

  return useCallback(
    async (input: RecipeShareInput): Promise<void> => {
      try {
        const result = await platform.share.recipe(input);
        if (result === "copied") toast.success(t("linkCopied"));
      } catch (caughtError) {
        if (isShareCancelled(caughtError)) return;
        toast.error(t("shareRecipeFailed"));
        throw caughtError;
      }
    },
    [platform, t],
  );
}
