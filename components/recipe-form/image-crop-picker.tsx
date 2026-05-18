"use client";

import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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
  return {
    x: Math.round(p.x),
    y: Math.round(p.y),
    w: Math.round(p.width),
    h: Math.round(p.height),
  };
}

export function ImageCropPicker({
  imageSrc,
  crop,
  onChange,
}: ImageCropPickerProps) {
  return (
    <ReactCrop
      crop={crop ? toPercentCrop(crop) : undefined}
      onChange={(_, pct) =>
        onChange(pct.width > 1 && pct.height > 1 ? fromPercentCrop(pct) : null)
      }
      minWidth={5}
      minHeight={5}
      style={{ width: "100%", borderRadius: 14 }}
    >
      {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
      <img
        src={imageSrc}
        alt="Crop"
        style={{ width: "100%", display: "block", touchAction: "none" }}
      />
    </ReactCrop>
  );
}
