import { useCallback, useRef } from "react";

const LONG_PRESS_DURATION = 450;

export function useLongPress(onLongPress: () => void, onCancel?: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(10);
      onLongPress();
    }, LONG_PRESS_DURATION);
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onCancel?.();
    }
  }, [onCancel]);

  const preventContext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onContextMenu: preventContext,
  };
}
