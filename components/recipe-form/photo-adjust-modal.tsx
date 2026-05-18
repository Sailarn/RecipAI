"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { FocalPointPicker } from "./focal-point-picker";

// Aspect ratios match actual display sizes in the app
const PREVIEWS = [
  { label: "Card", paddingTop: "32%" }, // 300×96  (3.13:1)
  { label: "Detail", paddingTop: "54%" }, // ~390×210 (1.86:1)
  { label: "Carousel", paddingTop: "49%" }, // ~390×190 (2.05:1)
] as const;

interface PhotoAdjustModalProps {
  imageSrc: string;
  focusX: number;
  focusY: number;
  onChange: (x: number, y: number) => void;
  onClose: () => void;
}

export function PhotoAdjustModal({
  imageSrc,
  focusX,
  focusY,
  onChange,
  onClose,
}: PhotoAdjustModalProps) {
  const objectPosition = `${focusX}% ${focusY}%`;

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

      {/* Focal point picker */}
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
                <div style={{ position: "absolute", inset: 0 }}>
                  {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
                  <img
                    src={imageSrc}
                    alt={`${label} preview`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition,
                      userSelect: "none",
                    }}
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
