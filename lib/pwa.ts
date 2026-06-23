/**
 * True when running as an installed standalone PWA rather than a browser tab.
 * Covers both the standard `display-mode: standalone` media query and iOS
 * Safari's legacy `navigator.standalone` flag. Client-only — guards against SSR.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * True on iOS (iPhone/iPad/iPod). iPadOS 13+ reports as desktop Safari, so a
 * touch-capable Mac is treated as iOS too. Client-only — guards against SSR.
 */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const isAppleMobileUa = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIpadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isAppleMobileUa || isIpadOs;
}
