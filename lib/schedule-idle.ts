/**
 * Runs `callback` when the browser is idle (or after a short timeout as a
 * fallback), so low-priority background work never competes with user
 * interaction or the current render.
 */
export function scheduleIdle(callback: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback, { timeout: 2000 });
  } else {
    window.setTimeout(callback, 200);
  }
}
