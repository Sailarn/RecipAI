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
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function calcFromPointer(event: React.PointerEvent) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onChange(
      Math.max(
        0,
        Math.min(
          100,
          Math.round(((event.clientX - rect.left) / rect.width) * 100),
        ),
      ),
      Math.max(
        0,
        Math.min(
          100,
          Math.round(((event.clientY - rect.top) / rect.height) * 100),
        ),
      ),
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden border border-[rgba(255,200,100,0.18)] select-none"
      style={{ height, borderRadius }}
    >
      {/* biome-ignore lint/performance/noImgElement: blob/external URL — next/image rejects blob URLs */}
      <img
        src={imageSrc}
        alt="Focal point preview"
        className="w-full h-full object-cover pointer-events-none select-none block"
        style={{ objectPosition: `${focusX}% ${focusY}%` }}
      />
      {showCrosshair && (
        <>
          <div
            className="absolute top-0 bottom-0 w-px bg-[rgba(255,255,255,0.25)] -translate-x-1/2 pointer-events-none"
            style={{ left: `${focusX}%` }}
          />
          <div
            className="absolute left-0 right-0 h-px bg-[rgba(255,255,255,0.25)] -translate-y-1/2 pointer-events-none"
            style={{ top: `${focusY}%` }}
          />
        </>
      )}
      <button
        type="button"
        aria-label="Drag to set focal point"
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(255,255,255,0.95)] shadow-[0_0_0_2px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.5)] cursor-grab touch-none border-0 p-0"
        style={{
          left: `${focusX}%`,
          top: `${focusY}%`,
          width: dotSize,
          height: dotSize,
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragging.current = true;
          calcFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (dragging.current) calcFromPointer(event);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      />
    </div>
  );
}
