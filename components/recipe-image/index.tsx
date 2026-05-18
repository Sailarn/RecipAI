"use client";

import Image from "next/image";
import { useState } from "react";

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";
const PLACEHOLDER_URL = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL ?? "";

function getOptimizedUrl(url: string, width: number): string {
  if (!url || !url.startsWith(IMAGEKIT_URL)) return url;
  return `${url}?tr=w-${width},f-webp,q-80`;
}

interface RecipeImageProps {
  imageUrl?: string;
  title: string;
  sizes?: string;
  width?: number;
  priority?: boolean;
  objectPosition?: string;
}

export const RecipeImage = ({
  imageUrl,
  title,
  sizes = "100vw",
  width = 800,
  priority = false,
  objectPosition = "50% 50%",
}: RecipeImageProps) => {
  const [errored, setErrored] = useState(false);
  const src = errored || !imageUrl ? PLACEHOLDER_URL : imageUrl;
  const optimizedSrc = getOptimizedUrl(src, width);

  return (
    <div className="relative w-full h-full bg-muted">
      <Image
        src={optimizedSrc}
        alt={title}
        fill
        priority={priority}
        className="object-cover"
        sizes={sizes}
        loading="eager"
        onError={() => setErrored(true)}
        style={{ objectPosition }}
      />
    </div>
  );
};
