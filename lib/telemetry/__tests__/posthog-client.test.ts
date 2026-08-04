import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { posthogMock, clientTelemetryEnabled } = vi.hoisted(() => ({
  posthogMock: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  },
  clientTelemetryEnabled: vi.fn(() => true),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));
vi.mock("../environment", () => ({ clientTelemetryEnabled }));

async function loadModule() {
  vi.resetModules();
  return import("../posthog-client");
}

/** Lets the dynamic import of posthog-js settle. */
function flushDynamicImport() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("posthog client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientTelemetryEnabled.mockReturnValue(true);
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test_key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("initPostHogClient", () => {
    it("loads and initialises the vendor with the configured key", async () => {
      const { initPostHogClient } = await loadModule();

      initPostHogClient();
      await flushDynamicImport();

      expect(posthogMock.init).toHaveBeenCalledTimes(1);
      expect(posthogMock.init).toHaveBeenCalledWith(
        "phc_test_key",
        expect.objectContaining({ api_host: "/ingest" }),
      );
    });

    it("initialises only once across repeated calls", async () => {
      const { initPostHogClient } = await loadModule();

      initPostHogClient();
      initPostHogClient();
      await flushDynamicImport();
      initPostHogClient();
      await flushDynamicImport();

      expect(posthogMock.init).toHaveBeenCalledTimes(1);
    });

    it("does not load the vendor when telemetry is disabled", async () => {
      clientTelemetryEnabled.mockReturnValue(false);
      const { initPostHogClient } = await loadModule();

      initPostHogClient();
      await flushDynamicImport();

      expect(posthogMock.init).not.toHaveBeenCalled();
    });

    it("does not load the vendor without a key", async () => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
      const { initPostHogClient } = await loadModule();

      initPostHogClient();
      await flushDynamicImport();

      expect(posthogMock.init).not.toHaveBeenCalled();
    });
  });

  describe("captureClientEvent", () => {
    it("replays events fired while the vendor is still loading", async () => {
      const { captureClientEvent } = await loadModule();

      captureClientEvent("recipe_viewed", { via: "list" });
      expect(posthogMock.capture).not.toHaveBeenCalled();

      await flushDynamicImport();

      expect(posthogMock.capture).toHaveBeenCalledWith("recipe_viewed", {
        via: "list",
      });
    });

    it("captures directly once the vendor is loaded", async () => {
      const { captureClientEvent, initPostHogClient } = await loadModule();
      initPostHogClient();
      await flushDynamicImport();

      captureClientEvent("recipe_deleted", undefined);

      expect(posthogMock.capture).toHaveBeenCalledWith(
        "recipe_deleted",
        undefined,
      );
    });

    it("drops events when telemetry is disabled instead of queueing them", async () => {
      clientTelemetryEnabled.mockReturnValue(false);
      const { captureClientEvent } = await loadModule();

      captureClientEvent("recipe_viewed", { via: "list" });
      await flushDynamicImport();

      expect(posthogMock.capture).not.toHaveBeenCalled();
    });
  });

  describe("identifyClient", () => {
    it("replays an identify queued before the vendor loaded", async () => {
      const { identifyClient } = await loadModule();

      identifyClient("user-1", { plan: "free" });
      await flushDynamicImport();

      expect(posthogMock.identify).toHaveBeenCalledWith("user-1", {
        plan: "free",
      });
    });
  });

  describe("resetClient", () => {
    it("resets once the vendor is loaded", async () => {
      const { initPostHogClient, resetClient } = await loadModule();
      initPostHogClient();
      await flushDynamicImport();

      resetClient();

      expect(posthogMock.reset).toHaveBeenCalledTimes(1);
    });

    it("is a no-op when the vendor never loaded", async () => {
      const { resetClient } = await loadModule();

      resetClient();
      await flushDynamicImport();

      expect(posthogMock.reset).not.toHaveBeenCalled();
    });
  });
});
