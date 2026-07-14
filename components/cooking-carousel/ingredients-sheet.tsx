import { XIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { ServingsCalculator } from "@/components/servings-calculator";
import type { Recipe } from "@/lib/db/schema";

interface IngredientsSheetProps {
  recipe: Recipe;
  locale: string;
  onClose: () => void;
}

export function IngredientsSheet({
  recipe,
  locale,
  onClose,
}: IngredientsSheetProps) {
  return createPortal(
    <>
      <button
        type="button"
        aria-label="Close ingredients"
        onClick={onClose}
        className="fixed inset-0 bg-[rgba(6,4,2,0.6)] z-[400] border-none cursor-default p-0"
      />
      <div className="fixed bottom-0 left-0 right-0 max-h-[60%] bg-[rgba(6,4,2,0.97)] backdrop-blur-[20px] rounded-t-[20px] z-[401] overflow-y-auto pt-5 px-[14px] pb-[30px]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ingredients panel"
          className="absolute top-3 right-3 bg-[rgba(0,0,0,0.38)] backdrop-blur-[16px] rounded-full py-1.5 px-2.5 cursor-pointer border border-white/[0.15] text-white/90 flex items-center justify-center"
        >
          <XIcon className="w-3 h-3" />
        </button>
        <ServingsCalculator
          originalServings={recipe.servings}
          ingredients={recipe.ingredients}
          sections={recipe.sections}
          canonicalIngredientIds={recipe.canonicalIngredientIds ?? undefined}
          locale={locale}
        />
      </div>
    </>,
    document.body,
  );
}
