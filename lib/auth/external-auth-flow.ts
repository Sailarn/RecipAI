import {
  DEVICE_POLL_INTERVAL_MS,
  EXTERNAL_AUTH_TTL_MS,
  PWA_AUTH_CLIENT_ID,
} from "./external-auth-config";

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: number;
  intervalMs: number;
}

type AuthResponse<T> = Promise<{
  data: T | null;
  error: { error?: string; message?: string } | null;
}>;

export interface DeviceAuthClient {
  device: {
    code(input: { client_id: string; scope?: string }): AuthResponse<{
      device_code: string;
      user_code: string;
      verification_uri_complete?: string;
      verification_uri: string;
      expires_in?: number;
      interval?: number;
    }>;
    token(input: {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code";
      device_code: string;
      client_id: string;
    }): AuthResponse<{ access_token: string }>;
  };
}

// better-auth's device-authorization client is structurally compatible with
// DeviceAuthClient, but its inferred type doesn't line up nominally. Centralize
// the single cast here (with the device methods asserted present) rather than
// casting `as unknown as` at call sites.
export function toDeviceAuthClient(client: {
  device?: unknown;
}): DeviceAuthClient {
  if (!client.device) {
    throw new Error("Auth client is missing the device-authorization plugin");
  }
  return client as DeviceAuthClient;
}

export type DeviceFlowResult =
  | { status: "authenticated" }
  | { status: "denied" | "expired" | "cancelled" };

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  return (
    signal.aborted ||
    (error instanceof DOMException && error.name === "AbortError")
  );
}

function abortableDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

export async function requestDeviceAuthorization(
  client: DeviceAuthClient,
): Promise<DeviceAuthorization> {
  const response = await client.device.code({
    client_id: PWA_AUTH_CLIENT_ID,
    scope: "openid profile email",
  });
  if (!response.data) {
    throw new Error(
      response.error?.message ?? "Unable to start Google sign-in",
    );
  }

  const expiresInMs = (response.data.expires_in ?? 300) * 1000;
  return {
    deviceCode: response.data.device_code,
    userCode: response.data.user_code,
    verificationUrl:
      response.data.verification_uri_complete ??
      `${response.data.verification_uri}?user_code=${encodeURIComponent(response.data.user_code)}`,
    expiresAt: Date.now() + Math.min(expiresInMs, EXTERNAL_AUTH_TTL_MS),
    intervalMs: (response.data.interval ?? 5) * 1000,
  };
}

export async function pollDeviceAuthorization({
  client,
  authorization,
  signal,
}: {
  client: DeviceAuthClient;
  authorization: DeviceAuthorization;
  signal: AbortSignal;
}): Promise<DeviceFlowResult> {
  let intervalMs = Math.max(authorization.intervalMs, DEVICE_POLL_INTERVAL_MS);

  try {
    while (Date.now() < authorization.expiresAt) {
      await abortableDelay(intervalMs, signal);
      let response: Awaited<ReturnType<DeviceAuthClient["device"]["token"]>>;
      try {
        response = await client.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: authorization.deviceCode,
          client_id: PWA_AUTH_CLIENT_ID,
        });
      } catch (error) {
        if (isAbortError(error, signal)) return { status: "cancelled" };
        continue;
      }
      if (response.data?.access_token) return { status: "authenticated" };

      const errorCode = response.error?.error;
      if (errorCode === "access_denied") return { status: "denied" };
      if (errorCode === "expired_token" || errorCode === "invalid_grant") {
        return { status: "expired" };
      }
      if (errorCode === "slow_down") intervalMs += DEVICE_POLL_INTERVAL_MS;
    }
    return { status: "expired" };
  } catch (error) {
    if (isAbortError(error, signal)) {
      return { status: "cancelled" };
    }
    throw error;
  }
}

export function openExternalAuth(url: string): boolean {
  return window.open(url, "_blank", "noopener,noreferrer") !== null;
}

export async function copyExternalAuthUrl(url: string): Promise<void> {
  await navigator.clipboard.writeText(url);
}
