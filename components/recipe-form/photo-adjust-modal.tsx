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

const iconBtnStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.10)",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
};

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

  function handleCropChange(c: CropRect | null) {
    setCrop(c);
    onCropChange(c);
  }

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "rgba(6,4,2,0.97)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 16px 12px",
          flexShrink: 0,
        }}
      >
        {step === "focus" ? (
          <button
            type="button"
            onClick={() => setStep("crop")}
            aria-label="Back to crop"
            style={iconBtnStyle}
          >
            <ChevronLeft size={18} color="rgba(255,255,255,0.75)" />
          </button>
        ) : (
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--fg-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            Crop photo
          </p>
        )}
        {step === "focus" && (
          <p
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--fg-1)",
              fontFamily: "var(--font-display)",
              pointerEvents: "none",
            }}
          >
            Adjust focus
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={iconBtnStyle}
        >
          <X size={15} color="rgba(255,255,255,0.75)" />
        </button>
      </div>

      {step === "crop" && (
        <>
          {/* Crop picker */}
          <div
            style={{
              padding: "0 16px",
              flexShrink: 0,
              touchAction: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <p style={{ fontSize: 11, color: "var(--fg-2)" }}>
                Drag to crop (optional)
              </p>
              {hasCrop && (
                <button
                  type="button"
                  onClick={() => handleCropChange(null)}
                  style={{
                    fontSize: 11,
                    color: "var(--fg-2)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
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

          {/* Next */}
          <div
            style={{
              padding: "20px 16px 48px",
              flexShrink: 0,
              marginTop: "auto",
            }}
          >
            <button
              type="button"
              onClick={() => setStep("focus")}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: "rgba(255,180,60,0.16)",
                border: "1px solid rgba(255,200,100,0.28)",
                color: "var(--fg-1)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {hasCrop ? "Next →" : "Skip →"}
            </button>
          </div>
        </>
      )}

      {step === "focus" && (
        <>
          {/* Focal point picker */}
          <div style={{ padding: "0 16px", flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>
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

          {/* Previews */}
          <div style={{ padding: "20px 16px 0" }}>
            <p
              style={{
                fontSize: 11,
                color: "var(--fg-2)",
                marginBottom: 12,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              How it looks in the app
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PREVIEWS.map(({ label, aspectRatio }) => (
                <div key={label}>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--fg-2)",
                      marginBottom: 4,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </p>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
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

          {/* Done */}
          <div
            style={{
              padding: "20px 16px 48px",
              flexShrink: 0,
              marginTop: "auto",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                background: "rgba(255,180,60,0.16)",
                border: "1px solid rgba(255,200,100,0.28)",
                color: "var(--fg-1)",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
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
