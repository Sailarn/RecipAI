import { Check } from "lucide-react";
import { RecipeImage } from "@/components/recipe-image";
import { Badge } from "@/components/ui/badge";
import type { Recipe } from "@/lib/db/schema";

interface CardThumbnailProps {
  recipe: Pick<
    Recipe,
    | "title"
    | "imageUrl"
    | "imageFocusX"
    | "imageFocusY"
    | "imageCropX"
    | "imageCropY"
    | "imageCropWidth"
    | "imageCropHeight"
    | "category"
    | "status"
  >;
  priority?: boolean;
}

export function CardThumbnail({
  recipe,
  priority = false,
}: CardThumbnailProps) {
  return (
    <div className="relative w-full h-24 overflow-hidden">
      <RecipeImage
        imageUrl={recipe.imageUrl}
        title={recipe.title}
        sizes="(max-width: 768px) 50vw, 33vw"
        width={300}
        priority={priority}
        objectPosition={`${recipe.imageFocusX ?? 50}% ${recipe.imageFocusY ?? 50}%`}
        imageCropX={recipe.imageCropX}
        imageCropY={recipe.imageCropY}
        imageCropWidth={recipe.imageCropWidth}
        imageCropHeight={recipe.imageCropHeight}
      />
      {recipe.category && (
        <div className="absolute top-[7px] left-[7px]">
          <div className="bg-[rgba(0,0,0,0.45)] rounded-full backdrop-blur-[8px] inline-flex">
            <Badge category={recipe.category} />
          </div>
        </div>
      )}
      {recipe.status === "tried" && (
        <div
          key="tried-badge"
          data-testid="badge-tried"
          className="absolute top-[7px] right-[7px] w-[22px] h-[22px] rounded-full bg-[rgba(34,197,94,0.90)] backdrop-blur-[8px] border-[1.5px] border-[rgba(134,239,172,0.60)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] flex items-center justify-center animate-[tickIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        >
          <Check
            width={12}
            height={12}
            strokeWidth={2.5}
            className="text-white"
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
