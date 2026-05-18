"use client";

import { useRef } from "react";

interface FocalPointPickerProps {
  imageSrc: string;
  focusX: number;
  focusY: number;
  height?: number;
  borderRadius?: number;
  dotSize?: number;
  showCrosshair?: boolean;
  onChange: (x: number, y: number) => void;
}

export function FocalPointPicker({
  imageSrc,
  focusX,
  focusY,
  height = 160,
  borderRadius = 12,
  dotSize = 18,
  showCrosshair = false,
  onChange,
}: FocalPointPickerProps) {
  const dragging = useRef(false);

  function calc(e: React.PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    onChange(
      Math.max(
        0,
        Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 100)),
      ),
      Math.max(
        0,
        Math.min(100, Math.round(((e.clientY - r.top) / r.height) * 100)),
      ),
    );
  }

  return (
    <button
      type="button"
      aria-label="Drag to set focal point"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        calc(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) calc(e);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius,
        overflow: "hidden",
        cursor: "crosshair",
        border: "1px solid rgba(255,200,100,0.18)",
        padding: 0,
        background: "none",
        display: "block",
        touchAction: "none",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
      <img
        src={imageSrc}
        alt="Focal point preview"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: `${focusX}% ${focusY}%`,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: `${focusX}%`,
          top: `${focusY}%`,
          transform: "translate(-50%, -50%)",
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 0 0 2px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.5)",
          pointerEvents: "none",
        }}
      />
      {showCrosshair && (
        <>
          <div
            style={{
              position: "absolute",
              left: `${focusX}%`,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(255,255,255,0.25)",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: `${focusY}%`,
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(255,255,255,0.25)",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </button>
  );
}
