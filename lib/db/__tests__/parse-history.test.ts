import { beforeEach, describe, expect, it, vi } from "vitest";

const { toArray, primaryKeys, reverse, limit, orderBy } = vi.hoisted(() => {
  const toArray = vi.fn();
  const primaryKeys = vi.fn();
  const reverse = vi.fn(() => ({ toArray }));
  const limit = vi.fn(() => ({ primaryKeys }));
  const orderBy = vi.fn(() => ({ reverse, limit }));
  return { toArray, primaryKeys, reverse, limit, orderBy };
});

vi.mock("../db", () => ({
  db: {
    parseHistory: {
      put: vi.fn(),
      bulkPut: vi.fn(),
      count: vi.fn(),
      orderBy,
      bulkDelete: vi.fn(),
      clear: vi.fn(),
    },
  },
}));

import { db } from "../db";
import {
  bulkPutParseHistory,
  clearParseHistory,
  getParseHistory,
  recordParseHistory,
} from "../parse-history";
import type { ParseHistoryEntry } from "../schema";

const entry: ParseHistoryEntry = {
  id: "job-1",
  title: "Pasta",
  status: "done",
  url: "https://example.com/pasta",
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  reverse.mockReturnValue({ toArray });
  limit.mockReturnValue({ primaryKeys });
  orderBy.mockReturnValue({ reverse, limit });
});

describe("recordParseHistory", () => {
  it("upserts the entry by id via put", async () => {
    vi.mocked(db.parseHistory.count).mockResolvedValue(1);

    await recordParseHistory(entry);

    expect(db.parseHistory.put).toHaveBeenCalledWith(entry);
  });

  it("does not prune when under the cap", async () => {
    vi.mocked(db.parseHistory.count).mockResolvedValue(50);

    await recordParseHistory(entry);

    expect(db.parseHistory.bulkDelete).not.toHaveBeenCalled();
  });

  it("prunes the oldest rows once over the cap", async () => {
    vi.mocked(db.parseHistory.count).mockResolvedValue(103);
    primaryKeys.mockResolvedValue(["old-1", "old-2", "old-3"]);

    await recordParseHistory(entry);

    expect(limit).toHaveBeenCalledWith(3);
    expect(db.parseHistory.bulkDelete).toHaveBeenCalledWith([
      "old-1",
      "old-2",
      "old-3",
    ]);
  });
});

describe("getParseHistory", () => {
  it("returns entries ordered newest first", async () => {
    const rows = [entry];
    toArray.mockResolvedValue(rows);

    const result = await getParseHistory();

    expect(orderBy).toHaveBeenCalledWith("createdAt");
    expect(reverse).toHaveBeenCalled();
    expect(result).toBe(rows);
  });
});

describe("bulkPutParseHistory", () => {
  it("does nothing for an empty list", async () => {
    await bulkPutParseHistory([]);

    expect(db.parseHistory.bulkPut).not.toHaveBeenCalled();
  });

  it("bulk-puts the entries and prunes", async () => {
    vi.mocked(db.parseHistory.count).mockResolvedValue(1);

    await bulkPutParseHistory([entry]);

    expect(db.parseHistory.bulkPut).toHaveBeenCalledWith([entry]);
    expect(db.parseHistory.count).toHaveBeenCalled();
  });
});

describe("clearParseHistory", () => {
  it("clears the table", async () => {
    await clearParseHistory();

    expect(db.parseHistory.clear).toHaveBeenCalledOnce();
  });
});
