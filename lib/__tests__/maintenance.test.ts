import { beforeEach, describe, expect, it, vi } from "vitest";

const { select, limit } = vi.hoisted(() => ({
  select: vi.fn(),
  limit: vi.fn(),
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
vi.unmock("@/lib/maintenance");

import { db } from "@/db";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  ensureAppAvailable,
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

  it("reads config for every guarded request", async () => {
    mockConfigRows([{ maintenanceEnabled: false, maintenanceMessage: null }]);

    await ensureAppAvailable();
    await ensureAppAvailable();

    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("fails closed when config cannot be read", async () => {
    const error = new Error("config read failed");
    limit.mockRejectedValue(error);

    const response = await ensureAppAvailable();

    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({
      code: "MAINTENANCE_MODE",
      error: DEFAULT_MAINTENANCE_MESSAGE,
    });
  });
});
