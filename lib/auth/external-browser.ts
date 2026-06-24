// Browser/window helpers for the external-auth flow. The installed PWA's
// in-app browser has none of the user's saved Google accounts, so these get the
// user out to their real browser (open / copy / share) and finish a completed
// sign-in with a full reload. Kept separate from the device-authorization
// protocol in external-auth-flow.ts.

export function openExternalAuth(url: string): boolean {
  return window.open(url, "_blank", "noopener,noreferrer") !== null;
}

export async function copyExternalAuthUrl(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}

export async function copyAndOpenExternalAuthUrl(
  url: string,
): Promise<boolean> {
  await copyExternalAuthUrl(url);
  return openExternalAuth(url);
}

export function canShareExternalAuthUrl(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export async function shareExternalAuthUrl(url: string): Promise<void> {
  await navigator.share({
    title: "RecipAI Google sign-in",
    url,
  });
}

// Finish a device sign-in with a full-page navigation, not a client-side push:
// the better-auth session atom doesn't know the cookie was just set, so a soft
// transition keeps the stale signed-out state and lands on the login card.
// Reloading re-bootstraps the app and reads the fresh session cookie.
export function completeDeviceSignIn(destinationUrl: string): void {
  window.location.assign(destinationUrl);
}
