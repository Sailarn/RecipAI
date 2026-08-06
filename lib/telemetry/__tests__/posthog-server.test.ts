import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { capture, serverTelemetryEnabled } = vi.hoisted(() => ({
  capture: vi.fn(),
  serverTelemetryEnabled: vi.fn(() => true),
}));

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = capture;
  },
}));
vi.mock("../environment", () => ({ serverTelemetryEnabled }));

async function loadModule() {
  vi.resetModules();
  return import("../posthog-server");
}

describe("posthog server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serverTelemetryEnabled.mockReturnValue(true);
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "deadbeef1234");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("captureServerEvent", () => {
    it("merges the build id into the event properties", async () => {
      const { captureServerEvent } = await loadModule();

      captureServerEvent("rate_limit_hit", { caller_type: "user" });

      expect(capture).toHaveBeenCalledWith({
        distinctId: "server",
        event: "rate_limit_hit",
        properties: { caller_type: "user", build_id: "deadbeef1234" },
      });
    });

    it("still sends the build id for an event with no properties", async () => {
      const { captureServerEvent } = await loadModule();

      captureServerEvent("logout", undefined);

      expect(capture).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: { build_id: "deadbeef1234" },
        }),
      );
    });

    it("sends nothing when server telemetry is disabled", async () => {
      serverTelemetryEnabled.mockReturnValue(false);
      const { captureServerEvent } = await loadModule();

      captureServerEvent("logout", undefined);

      expect(capture).not.toHaveBeenCalled();
    });
  });
});
