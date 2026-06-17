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
