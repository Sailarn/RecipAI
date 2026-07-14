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
  imageCropX?: number;
  imageCropY?: number;
  imageCropWidth?: number;
  imageCropHeight?: number;
}

export const RecipeImage = ({
  imageUrl,
  title,
  sizes = "100vw",
  width = 800,
  priority = false,
  objectPosition = "50% 50%",
  imageCropX,
  imageCropY,
  imageCropWidth,
  imageCropHeight,
}: RecipeImageProps) => {
  const [errored, setErrored] = useState(false);
  const src = errored || !imageUrl ? PLACEHOLDER_URL : imageUrl;
  const optimizedSrc = getOptimizedUrl(src, width);

  const hasCrop =
    imageCropWidth != null &&
    imageCropHeight != null &&
    imageCropWidth > 0 &&
    imageCropHeight > 0;

  if (hasCrop) {
    const cropX = imageCropX ?? 0;
    const cropY = imageCropY ?? 0;
    const cropWidth = imageCropWidth ?? 100;
    const cropHeight = imageCropHeight ?? 100;
    const scaleX = 100 / cropWidth;
    const scaleY = 100 / cropHeight;

    // Parse focal point from objectPosition string ("50% 50%")
    const [focalX, focalY] = objectPosition.split(" ").map(parseFloat);
    const relativeFocalX = Math.max(
      0,
      Math.min(100, ((focalX - cropX) / cropWidth) * 100),
    );
    const relativeFocalY = Math.max(
      0,
      Math.min(100, ((focalY - cropY) / cropHeight) * 100),
    );

    return (
      <div className="relative w-full h-full overflow-hidden bg-muted">
        <div
          style={{
            position: "absolute",
            width: `${scaleX * 100}%`,
            height: `${scaleY * 100}%`,
            left: `${-cropX * scaleX}%`,
            top: `${-cropY * scaleY}%`,
          }}
        >
          <div className="relative w-full h-full">
            <Image
              src={optimizedSrc}
              alt={title}
              fill
              priority={priority}
              className="object-cover"
              sizes={sizes}
              onError={() => setErrored(true)}
              style={{
                objectPosition: `${relativeFocalX}% ${relativeFocalY}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-muted">
      <Image
        src={optimizedSrc}
        alt={title}
        fill
        priority={priority}
        className="object-cover"
        sizes={sizes}
        onError={() => setErrored(true)}
        style={{ objectPosition }}
      />
    </div>
  );
};
