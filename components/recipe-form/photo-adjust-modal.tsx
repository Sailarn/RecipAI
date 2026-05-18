"use client";

import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { FocalPointPicker } from "./focal-point-picker";
import { type CropRect, ImageCropPicker } from "./image-crop-picker";

const PREVIEWS = [
  { label: "Card", paddingTop: "32%" },
  { label: "Detail", paddingTop: "54%" },
  { label: "Carousel", paddingTop: "49%" },
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
      right: 0,
      bottom: 0,
      left: 0,
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

export function PhotoAdjustModal({
  imageSrc,
  focusX,
  focusY,
  onChange,
  crop,
  onCropChange,
  onClose,
}: PhotoAdjustModalProps) {
  const imgStyle = previewImgStyle(crop, focusX, focusY);
  const hasCrop = crop !== null && crop.w > 0 && crop.h > 0;

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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "56px 16px 12px",
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--fg-1)",
            fontFamily: "var(--font-display)",
          }}
        >
          Adjust photo
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
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
          }}
        >
          <X size={15} color="rgba(255,255,255,0.75)" />
        </button>
      </div>

      {/* Focus point */}
      <div style={{ padding: "0 16px", flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 6 }}>
          Drag to set focus point
        </p>
        <FocalPointPicker
          imageSrc={imageSrc}
          focusX={focusX}
          focusY={focusY}
          height={210}
          borderRadius={14}
          dotSize={22}
          showCrosshair
          onChange={onChange}
        />
      </div>

      {/* Crop */}
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
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
              onClick={() => onCropChange(null)}
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
          onChange={onCropChange}
        />
      </div>

      {/* Previews */}
      <div style={{ padding: "20px 16px 40px" }}>
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
          {PREVIEWS.map(({ label, paddingTop }) => (
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
                  paddingTop,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    overflow: "hidden",
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
            </div>
          ))}
        </div>
      </div>

      {/* Done */}
      <div style={{ padding: "0 16px 48px", flexShrink: 0, marginTop: "auto" }}>
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
    </div>,
    document.body,
  );
}
