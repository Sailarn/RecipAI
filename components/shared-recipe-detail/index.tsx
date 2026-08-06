"use client";

import { Bookmark, ChevronLeft } from "lucide-react";
import type { PublicRecipe } from "@/lib/public-recipes/types";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { IngredientsList } from "../recipe-detail/ingredients-list";
import { InstructionsList } from "../recipe-detail/instructions-list";
import { RecipeHero } from "../recipe-detail/recipe-hero";
import { RecipeMeta } from "../recipe-detail/recipe-meta";
import { useSaveSharedCopy } from "./use-save-shared-copy";

interface SharedRecipeDetailProps {
  locale: string;
  recipe: PublicRecipe;
  // Called with the new local id once the copy is saved. The caller (not this
  // component) owns swapping the view to the owned recipe — SharedRecipeDetail
  // has no reason to know how that's rendered.
  onSaved: (recipeId: string) => void;
}

export function SharedRecipeDetail({
  locale,
  recipe,
  onSaved,
}: SharedRecipeDetailProps) {
  const navigate = useNavigate();
  const { saving, saveCopy } = useSaveSharedCopy(recipe);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-base)]">
      <div className="relative z-20 shrink-0 pt-[max(16px,calc(env(safe-area-inset-top)+4px))] px-[14px] pb-2">
        <button
          type="button"
          onClick={() => navigate.back(routes.recipes.list(locale))}
          className="py-[7px] pr-[14px] pl-[10px] flex items-center gap-1 bg-[rgba(0,0,0,0.38)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.15)] rounded-full text-white text-xs"
        >
          <ChevronLeft size={13} />
          Recipes
        </button>
      </div>

      <div className="relative z-[1] flex-1 overflow-y-auto -mt-[72px] px-[14px] pb-28 select-text">
        <RecipeHero recipe={recipe} />
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[14px] border border-[rgba(255,200,100,0.16)] bg-[rgba(20,16,8,0.6)] px-[13px] py-[9px] backdrop-blur-[16px]">
          <span className="text-xs text-[var(--fg-1)]">
            Shared by {recipe.owner.name}
          </span>
          <span className="rounded-full bg-[rgba(139,92,246,0.18)] px-[9px] py-1 text-[10px] font-bold uppercase text-violet-300">
            View only
          </span>
        </div>
        <h1 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-extrabold text-[var(--fg-1)]">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mb-4 text-sm text-[var(--fg-2)]">
            {recipe.description}
          </p>
        )}
        <RecipeMeta
          prepTime={recipe.prepTime}
          cookTime={recipe.cookTime}
          totalTime={recipe.totalTime}
        />
        <div className="mb-4">
          <IngredientsList
            ingredients={recipe.ingredients}
            sections={recipe.sections}
          />
        </div>
        <InstructionsList
          instructions={recipe.instructions}
          sections={recipe.sections}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 bg-[linear-gradient(to_top,var(--bg-base)_70%,transparent)] px-[18px] pb-[max(30px,env(safe-area-inset-bottom))] pt-8">
        <button
          type="button"
          disabled={saving}
          onClick={() => saveCopy(onSaved)}
          className="w-full flex items-center justify-center gap-2 rounded-[18px] border-0 bg-[var(--action-primary)] p-4 text-[15px] font-bold text-white shadow-[0_6px_24px_color-mix(in_oklch,var(--action-primary)_50%,transparent)] disabled:opacity-60"
        >
          <Bookmark size={18} />
          {saving ? "Saving..." : "Save to my recipes"}
        </button>
      </div>
    </div>
  );
}
