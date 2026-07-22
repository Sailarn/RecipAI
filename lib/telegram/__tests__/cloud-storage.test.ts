import { afterEach, describe, expect, it, vi } from "vitest";

const getTelegramWebApp = vi.hoisted(() => vi.fn());
vi.mock("../webapp", () => ({ getTelegramWebApp }));

import { getCloudItem, setCloudItem } from "../cloud-storage";

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCloudItem", () => {
  it("resolves null when CloudStorage is unavailable", async () => {
    getTelegramWebApp.mockReturnValue(undefined);

    await expect(getCloudItem("theme")).resolves.toBeNull();
  });

  it("resolves the stored value from the error-first callback", async () => {
    getTelegramWebApp.mockReturnValue({
      CloudStorage: {
        getItem: (_key: string, cb: (e: null, v: string) => void) =>
          cb(null, "light"),
      },
    });

    await expect(getCloudItem("theme")).resolves.toBe("light");
  });

  it("resolves null when the callback reports an error", async () => {
    getTelegramWebApp.mockReturnValue({
      CloudStorage: {
        getItem: (_key: string, cb: (e: string) => void) => cb("boom"),
      },
    });

    await expect(getCloudItem("theme")).resolves.toBeNull();
  });
});

describe("setCloudItem", () => {
  it("resolves false when CloudStorage is unavailable", async () => {
    getTelegramWebApp.mockReturnValue(undefined);

    await expect(setCloudItem("theme", "dark")).resolves.toBe(false);
  });

  it("resolves true on a successful write", async () => {
    getTelegramWebApp.mockReturnValue({
      CloudStorage: {
        setItem: (
          _key: string,
          _value: string,
          cb: (e: null, ok: boolean) => void,
        ) => cb(null, true),
      },
    });

    await expect(setCloudItem("theme", "dark")).resolves.toBe(true);
  });

  it("resolves false when the write reports an error", async () => {
    getTelegramWebApp.mockReturnValue({
      CloudStorage: {
        setItem: (_key: string, _value: string, cb: (e: string) => void) =>
          cb("boom"),
      },
    });

    await expect(setCloudItem("theme", "dark")).resolves.toBe(false);
  });
});
