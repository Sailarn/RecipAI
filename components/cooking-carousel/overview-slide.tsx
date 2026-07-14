import { RecipeImage } from "@/components/recipe-image";
import { ServingsCalculator } from "@/components/servings-calculator";
import type { Recipe } from "@/lib/db/schema";

export function OverviewSlide({
  recipe,
  locale,
}: {
  recipe: Recipe;
  locale: string;
}) {
  return (
    <div
      className="px-[14px] h-full overflow-y-auto"
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <h1 className="font-display text-[22px] font-extrabold text-[var(--fg-1)] mb-1">
        {recipe.title}
      </h1>
      {recipe.description && (
        <p className="text-xs text-[var(--fg-2)] mb-4">{recipe.description}</p>
      )}
      {recipe.imageUrl && (
        <div className="relative w-full h-[190px] rounded-2xl overflow-hidden mb-3">
          <RecipeImage
            imageUrl={recipe.imageUrl}
            title={recipe.title}
            width={800}
            objectPosition={`${recipe.imageFocusX ?? 50}% ${recipe.imageFocusY ?? 50}%`}
            imageCropX={recipe.imageCropX}
            imageCropY={recipe.imageCropY}
            imageCropWidth={recipe.imageCropWidth}
            imageCropHeight={recipe.imageCropHeight}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,4,2,0.97)_0%,transparent_60%)]" />
        </div>
      )}
      <ServingsCalculator
        originalServings={recipe.servings}
        ingredients={recipe.ingredients}
        sections={recipe.sections}
        canonicalIngredientIds={recipe.canonicalIngredientIds ?? undefined}
        locale={locale}
      />
    </div>
  );
}
