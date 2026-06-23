import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { deviceCode } from "../auth";

describe("deviceCode schema", () => {
  it("uses the field names required by Better Auth", () => {
    const config = getTableConfig(deviceCode);

    expect(config.name).toBe("device_code");
    expect(config.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "device_code",
        "user_code",
        "user_id",
        "expires_at",
        "status",
        "last_polled_at",
        "polling_interval",
        "client_id",
        "scope",
      ]),
    );
  });
});
