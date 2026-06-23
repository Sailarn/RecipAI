/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type DeviceAuthClient,
  pollDeviceAuthorization,
  requestDeviceAuthorization,
} from "../external-auth-flow";

function createClient({
  codeData,
  tokenResponses = [],
}: {
  codeData?: Record<string, unknown>;
  tokenResponses?: Array<{
    data: { access_token: string } | null;
    error: { error: string } | null;
  }>;
} = {}) {
  return {
    device: {
      code: vi.fn().mockResolvedValue({
        data:
          codeData ??
          ({
            device_code: "device-code",
            user_code: "ABCD-EFGH",
            verification_uri: "https://auth.example/device",
            expires_in: 300,
            interval: 5,
          } as const),
        error: null,
      }),
      token: vi.fn().mockImplementation(() =>
        Promise.resolve(
          tokenResponses.shift() ?? {
            data: null,
            error: { error: "authorization_pending" },
          },
        ),
      ),
    },
  } as unknown as DeviceAuthClient;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("external device authentication", () => {
  it("requests a device code for the dedicated PWA client", async () => {
    const client = createClient();

    const authorization = await requestDeviceAuthorization(client);

    expect(client.device.code).toHaveBeenCalledWith({
      client_id: "recipai-pwa",
      scope: "openid profile email",
    });
    expect(authorization.verificationUrl).toBe(
      "https://auth.example/device?user_code=ABCD-EFGH",
    );
  });

  it("uses the complete verification URL when the server provides one", async () => {
    const client = createClient({
      codeData: {
        device_code: "device-code",
        user_code: "ABCD-EFGH",
        verification_uri: "https://auth.example/device",
        verification_uri_complete: "https://auth.example/device?code=complete",
      },
    });

    await expect(requestDeviceAuthorization(client)).resolves.toMatchObject({
      verificationUrl: "https://auth.example/device?code=complete",
    });
  });

  it("returns authenticated after the device grant succeeds", async () => {
    vi.useFakeTimers();
    const client = createClient({
      tokenResponses: [{ data: { access_token: "access-token" }, error: null }],
    });
    const result = pollDeviceAuthorization({
      client,
      authorization: {
        deviceCode: "device-code",
        userCode: "ABCD-EFGH",
        verificationUrl: "https://auth.example/device",
        expiresAt: Date.now() + 60_000,
        intervalMs: 5_000,
      },
      signal: new AbortController().signal,
    });

    await vi.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toEqual({ status: "authenticated" });
  });

  it.each([
    ["access_denied", "denied"],
    ["expired_token", "expired"],
    ["invalid_grant", "expired"],
  ] as const)("maps %s to %s", async (error, status) => {
    vi.useFakeTimers();
    const client = createClient({
      tokenResponses: [{ data: null, error: { error } }],
    });
    const result = pollDeviceAuthorization({
      client,
      authorization: {
        deviceCode: "device-code",
        userCode: "ABCD-EFGH",
        verificationUrl: "https://auth.example/device",
        expiresAt: Date.now() + 60_000,
        intervalMs: 5_000,
      },
      signal: new AbortController().signal,
    });

    await vi.advanceTimersByTimeAsync(5_000);

    await expect(result).resolves.toEqual({ status });
  });

  it("stops polling when cancelled", async () => {
    vi.useFakeTimers();
    const client = createClient();
    const controller = new AbortController();
    const result = pollDeviceAuthorization({
      client,
      authorization: {
        deviceCode: "device-code",
        userCode: "ABCD-EFGH",
        verificationUrl: "https://auth.example/device",
        expiresAt: Date.now() + 60_000,
        intervalMs: 5_000,
      },
      signal: controller.signal,
    });

    controller.abort();

    await expect(result).resolves.toEqual({ status: "cancelled" });
    expect(client.device.token).not.toHaveBeenCalled();
  });

  it("retries a transient network failure", async () => {
    vi.useFakeTimers();
    const client = createClient({
      tokenResponses: [{ data: { access_token: "access-token" }, error: null }],
    });
    vi.mocked(client.device.token)
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce({
        data: { access_token: "access-token" },
        error: null,
      });
    const result = pollDeviceAuthorization({
      client,
      authorization: {
        deviceCode: "device-code",
        userCode: "ABCD-EFGH",
        verificationUrl: "https://auth.example/device",
        expiresAt: Date.now() + 60_000,
        intervalMs: 5_000,
      },
      signal: new AbortController().signal,
    });

    await vi.advanceTimersByTimeAsync(10_000);

    await expect(result).resolves.toEqual({ status: "authenticated" });
    expect(client.device.token).toHaveBeenCalledTimes(2);
  });
});
