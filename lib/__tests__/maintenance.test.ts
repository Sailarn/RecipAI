import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, limit, captureError } = vi.hoisted(() => ({
  select: vi.fn(),
  limit: vi.fn(),
  captureError: vi.fn(),
}));

vi.mock("@/db", () => ({ db: { select } }));
vi.mock("@/db/schema/app-config", () => ({
  GLOBAL_APP_CONFIG_ID: "global",
  appConfig: {
    id: "id",
    maintenanceEnabled: "maintenance_enabled",
    maintenanceMessage: "maintenance_message",
  },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ captureError }));
vi.unmock("@/lib/maintenance");

import { db } from "@/db";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  ensureAppAvailable,
  resetAppConfigCache,
} from "@/lib/maintenance";

function mockConfigRows(rows: object[]) {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit,
  };
  limit.mockResolvedValue(rows);
  vi.mocked(select).mockReturnValue(chain as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  resetAppConfigCache();
  mockConfigRows([]);
});

describe("ensureAppAvailable", () => {
  it("allows requests when no config row exists", async () => {
    const response = await ensureAppAvailable();

    expect(response).toBeNull();
  });

  it("returns a 503 maintenance response with the default message", async () => {
    mockConfigRows([{ maintenanceEnabled: true, maintenanceMessage: null }]);

    const response = await ensureAppAvailable();

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({
      code: "MAINTENANCE_MODE",
      error: DEFAULT_MAINTENANCE_MESSAGE,
    });
  });

  it("uses the configured maintenance message when present", async () => {
    mockConfigRows([
      {
        maintenanceEnabled: true,
        maintenanceMessage: "Back after database maintenance",
      },
    ]);

    const response = await ensureAppAvailable();

    expect(await response?.json()).toEqual({
      code: "MAINTENANCE_MODE",
      error: "Back after database maintenance",
    });
  });

  describe("caching", () => {
    it("reads config once for a burst of guarded requests", async () => {
      mockConfigRows([{ maintenanceEnabled: false, maintenanceMessage: null }]);

      await ensureAppAvailable();
      await ensureAppAvailable();
      await ensureAppAvailable();

      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it("issues a single query for concurrent requests on a cold instance", async () => {
      mockConfigRows([{ maintenanceEnabled: false, maintenanceMessage: null }]);

      await Promise.all([
        ensureAppAvailable(),
        ensureAppAvailable(),
        ensureAppAvailable(),
      ]);

      expect(db.select).toHaveBeenCalledTimes(1);
    });

    it("re-reads config once the cache expires", async () => {
      mockConfigRows([{ maintenanceEnabled: false, maintenanceMessage: null }]);
      await ensureAppAvailable();

      vi.useFakeTimers();
      vi.advanceTimersByTime(31_000);
      await ensureAppAvailable();

      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it("picks up a maintenance toggle after the cache expires", async () => {
      mockConfigRows([{ maintenanceEnabled: false, maintenanceMessage: null }]);
      expect(await ensureAppAvailable()).toBeNull();

      mockConfigRows([{ maintenanceEnabled: true, maintenanceMessage: null }]);
      vi.useFakeTimers();
      vi.advanceTimersByTime(31_000);

      expect((await ensureAppAvailable())?.status).toBe(503);
    });
  });

  describe("when config cannot be read", () => {
    it("fails open so a config blip does not 503 the whole API", async () => {
      limit.mockRejectedValue(new Error("config read failed"));

      const response = await ensureAppAvailable();

      expect(response).toBeNull();
    });

    it("reports the failure", async () => {
      const error = new Error("config read failed");
      limit.mockRejectedValue(error);

      await ensureAppAvailable();

      expect(captureError).toHaveBeenCalledWith(error, {
        tags: { source: "maintenance-config" },
      });
    });

    it("keeps serving a maintenance window read before the failure", async () => {
      mockConfigRows([
        { maintenanceEnabled: true, maintenanceMessage: "Back soon" },
      ]);
      await ensureAppAvailable();

      vi.useFakeTimers();
      vi.advanceTimersByTime(31_000);
      limit.mockRejectedValue(new Error("config read failed"));

      const response = await ensureAppAvailable();

      expect(response?.status).toBe(503);
      expect(await response?.json()).toEqual({
        code: "MAINTENANCE_MODE",
        error: "Back soon",
      });
    });
  });
});
