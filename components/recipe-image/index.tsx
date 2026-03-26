"use client";

import Image from "next/image";

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;
const PLACEHOLDER_URL = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL!;

function getOptimizedUrl(url: string, width: number, height: number): string {
  if (!url || !url.startsWith(IMAGEKIT_URL)) return url;
  return `${url}?tr=w-${width},h-${height},fo-auto,f-webp,q-80`;
}

interface RecipeImageProps {
  imageUrl?: string;
  title: string;
  sizes?: string;
  width?: number;
  height?: number;
}

export const RecipeImage = ({
  imageUrl,
  title,
  sizes = "100vw",
  width = 800,
  height = 400,
}: RecipeImageProps) => {
  const src = imageUrl || PLACEHOLDER_URL;
  const optimizedSrc = getOptimizedUrl(src, width, height);

  return (
    <div className="relative w-full h-full">
      <Image
        src={optimizedSrc}
        alt={title}
        fill
        className="object-cover transition-opacity duration-300"
        sizes={sizes}
        onError={(e) => {
          e.currentTarget.src = PLACEHOLDER_URL;
        }}
      />
    </div>
  );
};
