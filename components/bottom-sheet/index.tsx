"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  /** testid for the backdrop button — kept distinct per caller for tests. */
  backdropTestId: string;
  /** Children receive `requestClose`, which plays the slide-down animation and
   *  fires `onClose` on animation end (never call `onClose` directly). */
  children: (requestClose: () => void) => ReactNode;
}

/**
 * Glass bottom sheet: portal to body, dimmed backdrop, slide-up/down animation.
 * Closing is two-phase — `requestClose` starts the slide-down, and `onClose`
 * fires from the panel's `onAnimationEnd` once it finishes.
 */
export function BottomSheet({
  title,
  onClose,
  backdropTestId,
  children,
}: BottomSheetProps) {
  const tCommon = useTranslations("common");
  const [mounted, setMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  function requestClose() {
    if (isClosing) return;
    setIsClosing(true);
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end touch-none">
      <button
        type="button"
        data-testid={backdropTestId}
        aria-label={tCommon("close")}
        onClick={requestClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[4px] border-none cursor-pointer p-0"
      />

      <div
        data-testid="sheet-panel"
        onAnimationEnd={() => {
          if (isClosing) onClose();
        }}
        className="relative z-[1] w-full bg-[rgba(18,14,8,0.92)] backdrop-blur-[32px] backdrop-saturate-200 border border-[rgba(255,200,100,0.18)] rounded-t-[28px] pt-5 px-[18px] pb-9 shadow-[0_-8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,220,130,0.12)]"
        style={{
          animation: isClosing
            ? "sheetSlideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="w-9 h-1 rounded-[2px] bg-[rgba(255,200,100,0.25)] mx-auto mb-[18px]" />

        <div className="text-base font-bold text-[var(--fg-1)] font-display mb-4">
          {title}
        </div>

        {children(requestClose)}
      </div>
    </div>,
    document.body,
  );
}
