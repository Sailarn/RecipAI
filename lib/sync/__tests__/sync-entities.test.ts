import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/db";
import { INGREDIENT_STATUS, type PantryItem } from "@/lib/db/schema";

const { mockPullVocab, mockSyncFetch } = vi.hoisted(() => ({
  mockPullVocab: vi.fn(),
  mockSyncFetch: vi.fn(),
}));

vi.mock("@/lib/db/sync-vocab", () => ({ pullVocab: mockPullVocab }));
vi.mock("@/lib/sync-fetch", () => ({ syncFetch: mockSyncFetch }));

import {
  applyReconcile,
  parseTimestamps,
  syncIngredients,
  syncPantry,
} from "../sync-entities";

const fetchMock = vi.fn();
const NOW = Date.parse("2026-10-28T12:00:00.000Z");

function pantryItem(id: string, name: string): PantryItem {
  return {
    id,
    ingredientId: id,
    name,
    qty: 1,
    unit: "pcs",
    cat: "other",
    on: true,
    addedAt: new Date(NOW),
  };
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

beforeEach(async () => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mockPullVocab.mockReset().mockResolvedValue(undefined);
  mockSyncFetch.mockReset();
  await db.pantry.clear();
  await db.ingredients.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("syncPantry", () => {
  it("replaces the local pantry with the server copy", async () => {
    await db.pantry.put(pantryItem("stale", "Stale"));
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [
          {
            ...pantryItem("salt", "Salt"),
            addedAt: "2026-10-01T00:00:00.000Z",
          },
        ],
      }),
    );

    await syncPantry();

    const rows = await db.pantry.toArray();
    expect(rows.map((row) => row.id)).toEqual(["salt"]);
    expect(rows[0].addedAt).toEqual(new Date("2026-10-01T00:00:00.000Z"));
  });

  it("leaves the local pantry alone when the server request fails", async () => {
    await db.pantry.put(pantryItem("salt", "Salt"));
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await syncPantry();

    expect(await db.pantry.count()).toBe(1);
  });

  it("keeps the local pantry when writing the server copy fails", async () => {
    await db.pantry.put(pantryItem("salt", "Salt"));
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [{ name: "No id", addedAt: "2026-10-01" }] }),
    );

    await expect(syncPantry()).rejects.toThrow();

    expect((await db.pantry.toArray()).map((row) => row.id)).toEqual(["salt"]);
  });
});

describe("syncIngredients", () => {
  function provisional(
    id: string,
    overrides: { retryCount?: number; lastAttemptAt?: Date | null },
  ) {
    return {
      id,
      en: id,
      ua: null,
      category: "other",
      aliasesEn: [],
      aliasesUa: [],
      status: INGREDIENT_STATUS.PROVISIONAL,
      retryCount: 0,
      lastAttemptAt: null,
      ...overrides,
    };
  }

  it("pulls vocab, then retries only provisionals that are due", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await db.ingredients.bulkPut([
      provisional("due", {}),
      provisional("exhausted", { retryCount: 3 }),
      provisional("recent", { lastAttemptAt: new Date(NOW - 60_000) }),
      provisional("old-attempt", {
        lastAttemptAt: new Date(NOW - 10 * 60_000),
      }),
    ]);

    await syncIngredients();

    expect(mockPullVocab).toHaveBeenCalledOnce();
    const retriedIds = mockSyncFetch.mock.calls.map(
      ([, init]) => JSON.parse(init.body).id,
    );
    expect(retriedIds.sort()).toEqual(["due", "old-attempt"]);
  });
});

describe("applyReconcile", () => {
  type Item = {
    id: string;
    title: string;
    updatedAt: Date;
    syncedAt?: Date | null;
  };

  function makeTable() {
    return {
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    };
  }

  const old = new Date(NOW - 10 * 60_000);

  it("pulls server rows, deletes server-deleted rows and pushes new local rows", async () => {
    const table = makeTable();
    fetchMock.mockResolvedValue(jsonResponse({}));
    const local: Item[] = [
      { id: "deleted", title: "Gone", updatedAt: old, syncedAt: old },
      { id: "new", title: "Fresh", updatedAt: old },
    ];
    const server: Item[] = [{ id: "remote", title: "Remote", updatedAt: old }];

    await applyReconcile(local, server, {
      table,
      syncEndpoint: "/api/recipes/sync",
      bodyKey: "recipes",
      now: NOW,
    });

    expect(table.bulkPut).toHaveBeenCalledWith([
      { ...server[0], syncedAt: new Date(NOW) },
    ]);
    expect(table.bulkDelete).toHaveBeenCalledWith(["deleted"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      recipes: [{ id: "new", title: "Fresh", updatedAt: old.toISOString() }],
    });
    expect(table.update).toHaveBeenCalledWith("new", {
      syncedAt: new Date(NOW),
    });
  });

  it("does not mark pushed rows synced when the upload fails", async () => {
    const table = makeTable();
    fetchMock.mockResolvedValue(jsonResponse({}, false));

    await applyReconcile([{ id: "new", title: "Fresh", updatedAt: old }], [], {
      table,
      syncEndpoint: "/api/sync",
      bodyKey: "recipes",
      now: NOW,
    });

    expect(table.update).not.toHaveBeenCalled();
  });

  it("does nothing when both sides already match and are marked", async () => {
    const table = makeTable();
    const item: Item = {
      id: "same",
      title: "Same",
      updatedAt: old,
      syncedAt: old,
    };

    await applyReconcile([item], [{ ...item, syncedAt: undefined }], {
      table,
      syncEndpoint: "/api/sync",
      bodyKey: "collections",
      now: NOW,
    });

    expect(table.bulkPut).not.toHaveBeenCalled();
    expect(table.bulkDelete).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("parseTimestamps", () => {
  it("revives ISO createdAt/updatedAt strings into Dates", () => {
    const [row] = parseTimestamps<{
      id: string;
      createdAt: Date;
      updatedAt: Date;
    }>([
      {
        id: "r1",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-02T00:00:00.000Z",
      },
    ]);

    expect(row).toEqual({
      id: "r1",
      createdAt: new Date("2026-10-01T00:00:00.000Z"),
      updatedAt: new Date("2026-10-02T00:00:00.000Z"),
    });
  });
});
