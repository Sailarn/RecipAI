import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockBulkPut } = vi.hoisted(() => ({ mockBulkPut: vi.fn() }));

vi.mock("../db", () => ({
  db: { ingredients: { bulkPut: mockBulkPut } },
}));

import { api } from "@/lib/routes";
import { pullVocab } from "../sync-vocab";

const WATERMARK_KEY = "ingredientsSyncedAt";
const VERSION_KEY = "ingredientsSyncedVersion";
const APP_VERSION = "9.9.9";

function mockFetchOnce(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", APP_VERSION);
  mockBulkPut.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("pullVocab", () => {
  it("does a full pull with no watermark and records version + watermark", async () => {
    const fetchMock = mockFetchOnce({
      ingredients: [{ id: "salt", en: "Salt" }],
      serverMaxUpdatedAt: "2024-02-01T00:00:00.000Z",
    });

    await pullVocab();

    expect(fetchMock).toHaveBeenCalledWith(api.ingredients);
    expect(mockBulkPut).toHaveBeenCalledWith([{ id: "salt", en: "Salt" }]);
    expect(localStorage.getItem(WATERMARK_KEY)).toBe(
      "2024-02-01T00:00:00.000Z",
    );
    expect(localStorage.getItem(VERSION_KEY)).toBe(APP_VERSION);
  });

  it("delta-pulls from an overlapped watermark when the version is unchanged", async () => {
    localStorage.setItem(WATERMARK_KEY, "2024-01-01T00:01:00.000Z");
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    const fetchMock = mockFetchOnce({
      ingredients: [],
      serverMaxUpdatedAt: "",
    });

    await pullVocab();

    const overlapped = encodeURIComponent("2024-01-01T00:00:00.000Z");
    expect(fetchMock).toHaveBeenCalledWith(
      `${api.ingredients}?since=${overlapped}`,
    );
  });

  it("ignores the watermark and does a full pull after a version bump", async () => {
    localStorage.setItem(WATERMARK_KEY, "2024-01-01T00:01:00.000Z");
    localStorage.setItem(VERSION_KEY, "0.0.1");
    const fetchMock = mockFetchOnce({
      ingredients: [],
      serverMaxUpdatedAt: "2024-03-01T00:00:00.000Z",
    });

    await pullVocab();

    expect(fetchMock).toHaveBeenCalledWith(api.ingredients);
    expect(localStorage.getItem(VERSION_KEY)).toBe(APP_VERSION);
  });

  it("does not record the version when the fetch fails, so it retries", async () => {
    localStorage.setItem(VERSION_KEY, "0.0.1");
    mockFetchOnce({}, false);

    await pullVocab();

    expect(mockBulkPut).not.toHaveBeenCalled();
    expect(localStorage.getItem(VERSION_KEY)).toBe("0.0.1");
  });
});
