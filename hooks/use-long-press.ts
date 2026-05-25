import { useCallback, useRef } from "react";

const LONG_PRESS_DURATION = 450;
const MOVE_CANCEL_PX = 8;

export function useLongPress(
  onLongPress: (pos: { x: number; y: number }) => void,
  onCancel?: () => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onCancel?.();
    }
  }, [onCancel]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // On fine-pointer devices (mouse/trackpad) skip the timer — right-click via
      // onContextMenu handles desktop instead. This prevents conflicts with Chrome's
      // own context menu on Mac, including DevTools iPhone simulator.
      if (
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: fine)").matches
      ) {
        return;
      }
      startPos.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        // Clear ref BEFORE firing so cancel() won't see a pending timer
        // and won't call onCancel() — preserving didLongPress state in callers.
        timerRef.current = null;
        if (navigator.vibrate) navigator.vibrate(10);
        onLongPress(startPos.current);
      }, LONG_PRESS_DURATION);
    },
    [onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (timerRef.current === null) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      // Cancel if the pointer drifted enough that the user is probably scrolling
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
        cancel();
      }
    },
    [cancel],
  );

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return {
    onPointerDown,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onPointerMove,
    onContextMenu,
  };
}
