import { isStandalonePwa } from "@/lib/pwa";
import { trackEvent } from "@/lib/telemetry";

/**
 * Below this, the difference is rounding or a scrollbar, not a zoom setting.
 * iOS's smallest step away from 100% is 85%, a ratio of ~1.18, so there is a
 * wide margin between "noise" and "the user has zoomed".
 */
const ZOOM_EPSILON = 0.05;

/**
 * Reports an installed PWA rendering at a page zoom other than 100%.
 *
 * A standalone window fills the screen and the app is portrait-locked in the
 * manifest, so `innerWidth` should equal `screen.width`. Page zoom re-lays-out
 * the page at a wider CSS viewport, so any deviation is the zoom factor —
 * 393px of screen reported as a 462px viewport is 85% zoom.
 *
 * Deliberately measures the *layout* viewport rather than `visualViewport`:
 * pinch-zoom scales the visual viewport and leaves layout alone, so reading
 * `innerWidth` reports only persisted page zoom and stays quiet for a pinch the
 * user is actively holding.
 *
 * There is no way to prevent this from the page — page zoom is an
 * accessibility control with no override API, and `user-scalable=no` addresses
 * pinch-zoom, which iOS has ignored since iOS 10. Reporting it is the whole
 * remedy: it turns "the app looks wrong and I can't tell why" into a property
 * that is visible next to every other event in the session.
 */
export function reportDisplayScale(): void {
  // Only meaningful in standalone: a browser window is not the screen, and a
  // desktop tab is legitimately narrower than the display it sits on.
  if (!isStandalonePwa()) return;

  const viewportWidth = window.innerWidth;
  const screenWidth = window.screen?.width;
  if (!viewportWidth || !screenWidth) return;

  const zoom = screenWidth / viewportWidth;
  if (Math.abs(zoom - 1) < ZOOM_EPSILON) return;

  trackEvent("display_zoom_detected", {
    zoom: Math.round(zoom * 100) / 100,
    viewport_width: viewportWidth,
    screen_width: screenWidth,
  });
}
