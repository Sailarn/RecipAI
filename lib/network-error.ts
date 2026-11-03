/**
 * True for the error a browser throws when a fetch dies at the network level
 * (connection dropped, request cancelled by a reload, app suspended): a
 * TypeError whose message differs per engine, or an AbortError.
 *
 * Use it only where such a drop is expected and harmless, such as same-origin
 * background syncs that retry on their own. It is deliberately not a global
 * Sentry ignore: "Failed to fetch" is also what a CORS misconfiguration looks
 * like, and that must stay visible.
 */
const NETWORK_FAILURE_MESSAGES = [
  /^Load failed\b/, // Safari / WebKit
  /^Failed to fetch\b/, // Chrome / Chromium
  /^NetworkError when attempting to fetch resource/, // Firefox
  /^The network connection was lost/, // Safari, mid-request
  /^The Internet connection appears to be offline/, // Safari
];

export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return (
    error instanceof TypeError &&
    NETWORK_FAILURE_MESSAGES.some((pattern) => pattern.test(error.message))
  );
}
