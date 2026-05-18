"use client";

import { useEffect, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";

export type CropRect = { x: number; y: number; w: number; h: number };

interface ImageCropPickerProps {
  imageSrc: string;
  crop: CropRect | null;
  onChange: (crop: CropRect | null) => void;
}

function toPercentCrop(c: CropRect): PercentCrop {
  return { unit: "%", x: c.x, y: c.y, width: c.w, height: c.h };
}

function fromPercentCrop(p: PercentCrop): CropRect {
  return { x: p.x, y: p.y, w: p.width, h: p.height };
}

export function ImageCropPicker({
  imageSrc,
  crop,
  onChange,
}: ImageCropPickerProps) {
  const [rCrop, setRCrop] = useState<PercentCrop | undefined>(
    crop ? toPercentCrop(crop) : undefined,
  );

  useEffect(() => {
    if (!crop) setRCrop(undefined);
  }, [crop]);

  return (
    <ReactCrop
      crop={rCrop}
      onChange={(_, pct) => setRCrop(pct)}
      onComplete={(_, pct) => {
        if (pct.width >= 2 && pct.height >= 2) {
          onChange(fromPercentCrop(pct));
        } else {
          setRCrop(undefined);
          onChange(null);
        }
      }}
      minWidth={5}
      minHeight={5}
      style={{ width: "100%", borderRadius: 14, touchAction: "none" }}
    >
      {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
      <img
        src={imageSrc}
        alt="Crop"
        style={{ width: "100%", display: "block" }}
      />
    </ReactCrop>
  );
}
