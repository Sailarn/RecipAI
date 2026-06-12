import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  captureClientEvent,
  identifyClient,
  resetClient,
  captureServerEvent,
  sendLog,
  sentryCapture,
  isTelemetryAllowed,
} = vi.hoisted(() => ({
  captureClientEvent: vi.fn(),
  identifyClient: vi.fn(),
  resetClient: vi.fn(),
  captureServerEvent: vi.fn(),
  sendLog: vi.fn(),
  sentryCapture: vi.fn(),
  isTelemetryAllowed: vi.fn(() => true),
}));

vi.mock("../posthog-client", () => ({
  captureClientEvent,
  identifyClient,
  resetClient,
  initPostHogClient: vi.fn(),
}));
vi.mock("../posthog-server", () => ({ captureServerEvent }));
vi.mock("../axiom", () => ({ sendLog }));
vi.mock("@sentry/nextjs", () => ({ captureException: sentryCapture }));
vi.mock("../consent", () => ({ isTelemetryAllowed }));
// vitest.setup.ts globally mocks @/lib/telemetry — undo it for the module under test
vi.unmock("@/lib/telemetry");

import {
  captureError,
  identifyUser,
  log,
  resetIdentity,
  trackEvent,
} from "@/lib/telemetry";

function flushDynamicImports() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("telemetry facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackEvent", () => {
    it("routes to the client capturer in a browser environment", async () => {
      trackEvent("recipe_saved", { source: "parse" });
      await flushDynamicImports();

      expect(captureClientEvent).toHaveBeenCalledWith("recipe_saved", {
        source: "parse",
      });
      expect(captureServerEvent).not.toHaveBeenCalled();
    });

    it("swallows a throwing vendor module", async () => {
      captureClientEvent.mockImplementationOnce(() => {
        throw new Error("posthog exploded");
      });

      expect(() => trackEvent("logout", undefined)).not.toThrow();
      await flushDynamicImports();
    });
  });

  describe("captureError", () => {
    it("forwards to Sentry with context", () => {
      const error = new Error("boom");

      captureError(error, { extra: { jobId: "j1" } });

      expect(sentryCapture).toHaveBeenCalledWith(error, {
        tags: undefined,
        extra: { jobId: "j1" },
      });
    });

    it("never throws even when Sentry does", () => {
      sentryCapture.mockImplementationOnce(() => {
        throw new Error("sentry down");
      });

      expect(() => captureError(new Error("x"))).not.toThrow();
    });
  });

  describe("log", () => {
    it("does not ship to Axiom from the client", async () => {
      log("info", "hello", { a: 1 });
      await flushDynamicImports();

      expect(sendLog).not.toHaveBeenCalled();
    });
  });

  describe("consent gating", () => {
    it("does not call captureClientEvent when telemetry is not allowed", async () => {
      isTelemetryAllowed.mockReturnValueOnce(false);

      trackEvent("logout");
      await flushDynamicImports();

      expect(captureClientEvent).not.toHaveBeenCalled();
    });
  });

  describe("identifyUser", () => {
    it("routes to identifyClient with the same args", async () => {
      identifyUser("user-1", { locale: "en" });
      await flushDynamicImports();

      expect(identifyClient).toHaveBeenCalledWith("user-1", { locale: "en" });
    });
  });

  describe("resetIdentity", () => {
    it("routes to resetClient", async () => {
      resetIdentity();
      await flushDynamicImports();

      expect(resetClient).toHaveBeenCalled();
    });
  });
});
