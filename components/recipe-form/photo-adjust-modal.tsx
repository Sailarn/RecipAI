"use client";

import { ChevronLeft, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { FocalPointPicker } from "./focal-point-picker";
import { type CropRect, ImageCropPicker } from "./image-crop-picker";

const PREVIEWS = [
  { label: "Card", aspectRatio: "100/32" },
  { label: "Detail", aspectRatio: "100/54" },
  { label: "Carousel", aspectRatio: "100/49" },
] as const;

interface PhotoAdjustModalProps {
  imageSrc: string;
  focusX: number;
  focusY: number;
  onChange: (x: number, y: number) => void;
  crop: CropRect | null;
  onCropChange: (crop: CropRect | null) => void;
  onClose: () => void;
}

function previewImgStyle(
  crop: CropRect | null,
  focusX: number,
  focusY: number,
): CSSProperties {
  if (!crop || crop.w <= 0 || crop.h <= 0) {
    return {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: `${focusX}% ${focusY}%`,
      userSelect: "none",
    };
  }
  const sx = 100 / crop.w;
  const sy = 100 / crop.h;
  const relFx = Math.max(0, Math.min(100, ((focusX - crop.x) / crop.w) * 100));
  const relFy = Math.max(0, Math.min(100, ((focusY - crop.y) / crop.h) * 100));
  return {
    position: "absolute",
    width: `${sx * 100}%`,
    height: `${sy * 100}%`,
    left: `${-crop.x * sx}%`,
    top: `${-crop.y * sy}%`,
    objectFit: "cover",
    objectPosition: `${relFx}% ${relFy}%`,
    userSelect: "none",
  };
}

const iconBtnClass =
  "w-8 h-8 rounded-full bg-[rgba(255,255,255,0.10)] border-0 flex items-center justify-center cursor-pointer shrink-0";

export function PhotoAdjustModal({
  imageSrc,
  focusX: initFocusX,
  focusY: initFocusY,
  onChange,
  crop: initCrop,
  onCropChange,
  onClose,
}: PhotoAdjustModalProps) {
  const [focusX, setFocusX] = useState(initFocusX);
  const [focusY, setFocusY] = useState(initFocusY);
  const [crop, setCrop] = useState<CropRect | null>(initCrop);
  const [step, setStep] = useState<"crop" | "focus">("crop");

  const hasCrop = crop !== null && crop.w > 0 && crop.h > 0;
  const imgStyle = previewImgStyle(crop, focusX, focusY);

  function handleFocalChange(x: number, y: number) {
    setFocusX(x);
    setFocusY(y);
    onChange(x, y);
  }

  function handleCropChange(updatedCrop: CropRect | null) {
    setCrop(updatedCrop);
    onCropChange(updatedCrop);
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] bg-[rgba(6,4,2,0.97)] flex flex-col overflow-y-auto">
      <div className="relative flex items-center justify-between pt-[56px] px-4 pb-3 shrink-0">
        {step === "focus" ? (
          <button
            type="button"
            onClick={() => setStep("crop")}
            aria-label="Back to crop"
            className={iconBtnClass}
          >
            <ChevronLeft size={18} color="rgba(255,255,255,0.75)" />
          </button>
        ) : (
          <p className="text-[16px] font-bold text-[var(--fg-1)] font-[family-name:var(--font-display)]">
            Crop photo
          </p>
        )}
        {step === "focus" && (
          <p className="absolute left-1/2 -translate-x-1/2 text-[16px] font-bold text-[var(--fg-1)] font-[family-name:var(--font-display)] pointer-events-none">
            Adjust focus
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={iconBtnClass}
        >
          <X size={15} color="rgba(255,255,255,0.75)" />
        </button>
      </div>

      {step === "crop" && (
        <>
          <div className="px-4 pb-0 shrink-0 touch-none">
            <div className="flex items-center justify-between mb-[6px]">
              <p className="text-[11px] text-[var(--fg-2)]">
                Drag to crop (optional)
              </p>
              {hasCrop && (
                <button
                  type="button"
                  onClick={() => handleCropChange(null)}
                  className="text-[11px] text-[var(--fg-2)] bg-transparent border-0 cursor-pointer p-0 underline"
                >
                  Clear
                </button>
              )}
            </div>
            <ImageCropPicker
              imageSrc={imageSrc}
              crop={crop}
              onChange={handleCropChange}
            />
          </div>

          <div className="px-4 pt-5 pb-12 shrink-0 mt-auto">
            <button
              type="button"
              onClick={() => setStep("focus")}
              className="w-full py-[14px] rounded-[14px] bg-[rgba(255,180,60,0.16)] border border-[rgba(255,200,100,0.28)] text-[var(--fg-1)] text-[15px] font-semibold cursor-pointer"
            >
              {hasCrop ? "Next →" : "Skip →"}
            </button>
          </div>
        </>
      )}

      {step === "focus" && (
        <>
          <div className="px-4 pb-0 shrink-0">
            <p className="text-[11px] text-[var(--fg-2)] mb-[6px]">
              Drag the dot to set focus point
            </p>
            <FocalPointPicker
              imageSrc={imageSrc}
              focusX={focusX}
              focusY={focusY}
              height={210}
              borderRadius={14}
              dotSize={22}
              showCrosshair
              onChange={handleFocalChange}
            />
          </div>

          <div className="px-4 pt-5 pb-0">
            <p className="text-[11px] text-[var(--fg-2)] mb-3 uppercase tracking-[0.06em] font-semibold">
              How it looks in the app
            </p>
            <div className="flex flex-col gap-[10px]">
              {PREVIEWS.map(({ label, aspectRatio }) => (
                <div key={label}>
                  <p className="text-[11px] text-[var(--fg-2)] mb-1 font-semibold">
                    {label}
                  </p>
                  <div
                    className="relative w-full rounded-[10px] overflow-hidden border border-[rgba(255,255,255,0.07)]"
                    style={{ aspectRatio }}
                  >
                    {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
                    <img
                      src={imageSrc}
                      alt={`${label} preview`}
                      style={imgStyle}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 pt-5 pb-12 shrink-0 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-[14px] rounded-[14px] bg-[rgba(255,180,60,0.16)] border border-[rgba(255,200,100,0.28)] text-[var(--fg-1)] text-[15px] font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
