"use client";

import { Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { isMaintenanceError } from "@/lib/api/api-fetch";
import { authClient } from "@/lib/auth/auth-client";
import { updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { usePlatform } from "@/lib/platform";
import { setRecipeVisibility } from "@/lib/public-recipes/visibility-client";
import { routes } from "@/lib/routes";
import { ShareLinks } from "./share-links";
import { useShareDismiss } from "./use-share-dismiss";
import { VisibilityControl } from "./visibility-control";

interface ShareActionProps {
  locale: string;
  recipe: Recipe;
}

const triggerClass =
  "flex cursor-pointer items-center justify-center rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(0,0,0,0.38)] p-[9px] text-[rgba(255,255,255,0.90)] backdrop-blur-[16px]";

export function ShareAction({ locale, recipe }: ShareActionProps) {
  const t = useTranslations("recipes");
  const { data: session } = authClient.useSession();
  const platform = usePlatform();
  const rootRef = useRef<HTMLDivElement>(null);
  const recipePath = routes.recipes.detail(locale, recipe.id);
  const [shareUrl, setShareUrl] = useState(recipePath);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmedIsPublic, setConfirmedIsPublic] = useState(
    recipe.isPublic === true,
  );

  const closePopover = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    setShareUrl(new URL(recipePath, window.location.origin).toString());
  }, [recipePath]);

  useEffect(() => {
    setConfirmedIsPublic(recipe.isPublic === true);
  }, [recipe.isPublic]);

  useShareDismiss(isOpen, rootRef, closePopover);

  async function toggleVisibility() {
    const nextVisibility = !confirmedIsPublic;
    setIsUpdating(true);
    try {
      await setRecipeVisibility(recipe, nextVisibility);
      await updateRecipe(recipe.id, { isPublic: nextVisibility });
      setConfirmedIsPublic(nextVisibility);
    } catch (error) {
      if (!isMaintenanceError(error)) {
        toast.error(t("visibilityFailed"));
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("linkCopied"));
      setIsOpen(false);
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  }

  async function shareMoreOptions() {
    setIsOpen(false);
    try {
      const result = await platform.share.recipe({
        id: recipe.id,
        title: recipe.title,
        url: shareUrl,
      });
      if (result === "copied") toast.success(t("linkCopied"));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("shareRecipeFailed"));
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Share"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={triggerClass}
      >
        <Share2 size={14} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Share recipe"
          className="fixed right-[14px] top-[max(64px,calc(env(safe-area-inset-top)+52px))] z-50 w-[min(380px,calc(100vw-28px))] rounded-[26px] border border-[rgba(255,198,88,0.32)] bg-[rgba(10,10,8,0.97)] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.62)] backdrop-blur-2xl"
        >
          <span className="absolute -top-[7px] right-[103px] h-3.5 w-3.5 rotate-45 border-l border-t border-[rgba(255,198,88,0.32)] bg-[rgba(10,10,8,0.97)]" />
          <h2 className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-tight">
            Share recipe
          </h2>
          <p className="mb-5 mt-1 text-[13px] leading-relaxed text-white/60">
            Anyone with this link can save and cook your recipe.
          </p>

          <VisibilityControl
            isPublic={confirmedIsPublic}
            isSignedIn={!!session}
            isUpdating={isUpdating}
            onToggle={toggleVisibility}
          />

          {confirmedIsPublic && (
            <ShareLinks
              shareUrl={shareUrl}
              onCopy={copyLink}
              onShareMore={shareMoreOptions}
            />
          )}
        </div>
      )}
    </div>
  );
}
