import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DeviceAuthorization } from "../external-auth-flow";
import {
  clearPendingDeviceAuth,
  loadPendingDeviceAuth,
  savePendingDeviceAuth,
} from "../pending-device-auth";

function authorization(
  overrides: Partial<DeviceAuthorization> = {},
): DeviceAuthorization {
  return {
    deviceCode: "device-code",
    userCode: "USER1234",
    verificationUrl:
      "https://auth.example/external-auth/device?user_code=USER1234",
    expiresAt: Date.now() + 5 * 60 * 1000,
    intervalMs: 5000,
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("pending device auth", () => {
  it("round-trips a saved authorization", () => {
    const saved = authorization();

    savePendingDeviceAuth(saved);

    expect(loadPendingDeviceAuth()).toEqual(saved);
  });

  it("returns null and clears an expired authorization", () => {
    savePendingDeviceAuth(authorization({ expiresAt: Date.now() - 1 }));

    expect(loadPendingDeviceAuth()).toBeNull();
    expect(localStorage.getItem("pendingDeviceAuth")).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(loadPendingDeviceAuth()).toBeNull();
  });

  it("clears a stored authorization", () => {
    savePendingDeviceAuth(authorization());

    clearPendingDeviceAuth();

    expect(loadPendingDeviceAuth()).toBeNull();
  });
});
