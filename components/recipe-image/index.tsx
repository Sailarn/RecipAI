"use client";

import { useState } from "react";
import { getOptimizedUrl, isImageKitUrl } from "@/lib/imagekit-url";

const PLACEHOLDER_URL = process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL ?? "";

interface RecipeImageProps {
  imageUrl?: string;
  title: string;
  width?: number;
  priority?: boolean;
  /** Overrides the priority-derived default. Virtualized lists pass "eager":
   *  they only mount rows near the viewport, so native lazy-loading just
   *  re-defers every image each time a row scrolls back into view. */
  loading?: "lazy" | "eager";
  objectPosition?: string;
  imageCropX?: number;
  imageCropY?: number;
  imageCropWidth?: number;
  imageCropHeight?: number;
}

export const RecipeImage = ({
  imageUrl,
  title,
  width = 800,
  priority = false,
  loading,
  objectPosition = "50% 50%",
  imageCropX,
  imageCropY,
  imageCropWidth,
  imageCropHeight,
}: RecipeImageProps) => {
  const [errored, setErrored] = useState(false);
  // Only our own ImageKit copies are shown. Anything else is a source-site
  // URL left behind by a failed mirror: social CDNs sign and expire those,
  // and an expired Instagram URL hangs ~30s instead of failing — so never
  // request one, go straight to the placeholder.
  const src = !errored && isImageKitUrl(imageUrl) ? imageUrl : PLACEHOLDER_URL;
  const optimizedSrc = getOptimizedUrl(src, width);
  // Direct <img> (not next/image) so requests hit ImageKit's CDN and are cached
  // by the service worker. priority drives eager+high for the above-the-fold
  // hero; everything else lazy-loads.
  const loadingMode = loading ?? (priority ? "eager" : "lazy");
  const fetchPriority = priority ? "high" : "auto";

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
            {/* biome-ignore lint/performance/noImgElement: direct ImageKit CDN URL so the service worker caches it; next/image would route via /_next/image and defeat caching + prewarming */}
            <img
              src={optimizedSrc}
              alt={title}
              loading={loadingMode}
              fetchPriority={fetchPriority}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
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
      {/* biome-ignore lint/performance/noImgElement: direct ImageKit CDN URL so the service worker caches it; next/image would route via /_next/image and defeat caching + prewarming */}
      <img
        src={optimizedSrc}
        alt={title}
        loading={loadingMode}
        fetchPriority={fetchPriority}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setErrored(true)}
        style={{ objectPosition }}
      />
    </div>
  );
};
