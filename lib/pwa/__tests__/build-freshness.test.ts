import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("@/lib/telemetry", () => ({ trackEvent }));

import {
  reportBuildFreshness,
  watchServiceWorkerTakeover,
} from "../build-freshness";

const update = vi.fn();
const getRegistration = vi.fn(() => Promise.resolve({ update }));

function respondWith(body: unknown, ok = true) {
  return vi.fn(() =>
    Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response),
  );
}

describe("build freshness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "document-build");
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("reportBuildFreshness", () => {
    it("reports when the server has moved to a different build", async () => {
      vi.stubGlobal("fetch", respondWith({ buildId: "server-build" }));

      await reportBuildFreshness();

      expect(trackEvent).toHaveBeenCalledWith("stale_document_detected", {
        document_build_id: "document-build",
        server_build_id: "server-build",
      });
    });

    it("pulls a fresh service worker when the document is stale", async () => {
      vi.stubGlobal("fetch", respondWith({ buildId: "server-build" }));

      await reportBuildFreshness();

      expect(update).toHaveBeenCalledTimes(1);
    });

    it("stays silent when the builds match", async () => {
      vi.stubGlobal("fetch", respondWith({ buildId: "document-build" }));

      await reportBuildFreshness();

      expect(trackEvent).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    it("does not ask when no build id was compiled in", async () => {
      vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "");
      const fetchMock = respondWith({ buildId: "server-build" });
      vi.stubGlobal("fetch", fetchMock);

      await reportBuildFreshness();

      expect(fetchMock).not.toHaveBeenCalled();
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it("stays silent when the endpoint fails", async () => {
      vi.stubGlobal("fetch", respondWith({}, false));

      await reportBuildFreshness();

      expect(trackEvent).not.toHaveBeenCalled();
    });

    it("stays silent when the response carries no build id", async () => {
      vi.stubGlobal("fetch", respondWith({}));

      await reportBuildFreshness();

      expect(trackEvent).not.toHaveBeenCalled();
    });
  });

  describe("watchServiceWorkerTakeover", () => {
    it("reports a worker taking control of an open page", () => {
      let fire: (() => void) | undefined;
      vi.stubGlobal("navigator", {
        serviceWorker: {
          addEventListener: (type: string, handler: () => void) => {
            if (type === "controllerchange") fire = handler;
          },
        },
      });

      watchServiceWorkerTakeover();
      fire?.();

      expect(trackEvent).toHaveBeenCalledWith("sw_controller_changed");
    });

    it("does nothing where service workers are unavailable", () => {
      vi.stubGlobal("navigator", {});

      expect(() => watchServiceWorkerTakeover()).not.toThrow();
      expect(trackEvent).not.toHaveBeenCalled();
    });
  });
});
