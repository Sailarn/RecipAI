import type { DeviceAuthorization } from "./external-auth-flow";

// An installed iOS PWA is reloaded when it returns to the foreground after the
// user leaves for the system browser, which wipes in-memory state. Persist the
// pending device authorization so the login view can resume polling on reload
// and complete the sign-in instead of dropping back to the login card.
const PENDING_DEVICE_AUTH_KEY = "pendingDeviceAuth";

export function savePendingDeviceAuth(
  authorization: DeviceAuthorization,
): void {
  try {
    localStorage.setItem(
      PENDING_DEVICE_AUTH_KEY,
      JSON.stringify(authorization),
    );
  } catch {}
}

export function loadPendingDeviceAuth(): DeviceAuthorization | null {
  try {
    const raw = localStorage.getItem(PENDING_DEVICE_AUTH_KEY);
    if (!raw) return null;
    const authorization = JSON.parse(raw) as DeviceAuthorization;
    if (
      typeof authorization.deviceCode !== "string" ||
      typeof authorization.expiresAt !== "number" ||
      authorization.expiresAt <= Date.now()
    ) {
      clearPendingDeviceAuth();
      return null;
    }
    return authorization;
  } catch {
    return null;
  }
}

export function clearPendingDeviceAuth(): void {
  try {
    localStorage.removeItem(PENDING_DEVICE_AUTH_KEY);
  } catch {}
}
