import Image from "next/image";

const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

interface RecipeImageProps {
  imageUrl?: string;
  title: string;
  fill?: boolean;
  className?: string;
}

export const RecipeImage = ({
  imageUrl,
  title,
  fill,
  className,
}: RecipeImageProps) => {
  return (
    <Image
      src={imageUrl || "/images/recipe-placeholder.png"}
      alt={title}
      {...(!fill && { width: 800, height: 400 })}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={className || "w-full h-64 object-cover rounded-lg mb-6"}
      onError={(e) => {
        e.currentTarget.src = "/images/recipe-placeholder.png";
      }}
      fill={fill}
    />
  );
};
