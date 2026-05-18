"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";

export type CropRect = { x: number; y: number; w: number; h: number };

interface ImageCropPickerProps {
  imageSrc: string;
  crop: CropRect | null;
  onChange: (crop: CropRect | null) => void;
}

// react-image-crop v11 componentDidUpdate fires onComplete whenever crop goes
// from undefined → defined. Keeping a zero-size defined crop as the "empty"
// state prevents that spurious call and keeps onDocPointerMove from bailing
// out (it guards on !this.props.crop).
const EMPTY_CROP: PercentCrop = { unit: "%", x: 0, y: 0, width: 0, height: 0 };

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
  const [rCrop, setRCrop] = useState<PercentCrop>(
    crop ? toPercentCrop(crop) : EMPTY_CROP,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!crop) setRCrop(EMPTY_CROP);
  }, [crop]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const prevent = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchstart", prevent, { passive: false });
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      el.removeEventListener("touchstart", prevent);
      el.removeEventListener("touchmove", prevent);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ touchAction: "none" }}>
      <ReactCrop
        crop={rCrop}
        onChange={(_, pct) => setRCrop(pct)}
        onComplete={(_, pct) => {
          if (pct.width >= 2 && pct.height >= 2) {
            // Normalize to full width so horizontal sides are never clipped
            const full: PercentCrop = { ...pct, x: 0, width: 100 };
            setRCrop(full);
            onChange(fromPercentCrop(full));
          } else {
            setRCrop(EMPTY_CROP);
            onChange(null);
          }
        }}
        minWidth={5}
        minHeight={5}
        style={{ width: "100%", borderRadius: 14 }}
      >
        {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
        <img
          src={imageSrc}
          alt="Crop"
          draggable={false}
          style={{ width: "100%", display: "block" }}
        />
      </ReactCrop>
    </div>
  );
}
