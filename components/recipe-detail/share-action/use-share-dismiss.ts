"use client";

import { type RefObject, useEffect } from "react";

// Closes the popover when the user points outside it or presses Escape.
// `onDismiss` must be stable (wrap in useCallback) so the listeners aren't
// re-subscribed on every render.
export function useShareDismiss(
  isOpen: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  onDismiss: () => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        onDismiss();
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, rootRef, onDismiss]);
}
