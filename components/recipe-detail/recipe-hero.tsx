import { RecipeImage } from "@/components/recipe-image";
import type { Recipe } from "@/lib/db/schema";

interface RecipeHeroProps {
  recipe: Pick<
    Recipe,
    | "imageUrl"
    | "title"
    | "imageFocusX"
    | "imageFocusY"
    | "imageCropX"
    | "imageCropY"
    | "imageCropWidth"
    | "imageCropHeight"
  >;
}

export function RecipeHero({ recipe }: RecipeHeroProps) {
  return (
    <div className="h-[210px] shrink-0 relative flex items-center justify-center text-[72px] pt-[72px] overflow-hidden">
      {recipe.imageUrl ? (
        <RecipeImage
          imageUrl={recipe.imageUrl}
          title={recipe.title}
          width={800}
          sizes="100vw"
          priority
          objectPosition={`${recipe.imageFocusX ?? 50}% ${recipe.imageFocusY ?? 50}%`}
          imageCropX={recipe.imageCropX}
          imageCropY={recipe.imageCropY}
          imageCropWidth={recipe.imageCropWidth}
          imageCropHeight={recipe.imageCropHeight}
        />
      ) : (
        <span>{"🍽️"}</span>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-[linear-gradient(to_bottom,transparent,var(--bg-base))] pointer-events-none" />
    </div>
  );
}
