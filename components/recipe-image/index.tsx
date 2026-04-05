"use client";

import Image from "next/image";
import { useState } from "react";

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";
const PLACEHOLDER_URL = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL ?? "";

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
  priority?: boolean;
}

export const RecipeImage = ({
  imageUrl,
  title,
  sizes = "100vw",
  width = 800,
  height = 400,
  priority = false,
}: RecipeImageProps) => {
  const [errored, setErrored] = useState(false);
  const src = errored || !imageUrl ? PLACEHOLDER_URL : imageUrl;
  const optimizedSrc = getOptimizedUrl(src, width, height);

  return (
    <div className="relative w-full h-full">
      <Image
        src={optimizedSrc}
        alt={title}
        fill
        priority={priority}
        className="object-cover transition-opacity duration-300"
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        onError={() => setErrored(true)}
      />
    </div>
  );
};
