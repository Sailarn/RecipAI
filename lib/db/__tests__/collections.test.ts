import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db", () => ({
  db: {
    collections: {
      add: vi.fn(),
      toArray: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../supabase-sync-collections", () => ({
  syncCreateCollection: vi.fn(),
  syncDeleteCollection: vi.fn(),
}));

import { db } from "../db";
import {
  createCollection,
  deleteCollection,
  getAllCollections,
} from "../collections";

beforeEach(() => vi.clearAllMocks());

describe("createCollection", () => {
  it("adds collection to dexie and returns id", async () => {
    vi.mocked(db.collections.add).mockResolvedValue("new-id" as any);
    const id = await createCollection({ name: "Favourites", emoji: "⭐" });
    expect(db.collections.add).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Favourites", emoji: "⭐" }),
    );
    expect(id).toBeDefined();
  });
});

describe("getAllCollections", () => {
  it("returns all collections from dexie", async () => {
    vi.mocked(db.collections.toArray).mockResolvedValue([
      { id: "c1", name: "Favourites", emoji: "⭐" },
    ] as any);
    const result = await getAllCollections();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Favourites");
  });
});

describe("deleteCollection", () => {
  it("deletes from dexie", async () => {
    vi.mocked(db.collections.delete).mockResolvedValue(undefined);
    await deleteCollection("c1");
    expect(db.collections.delete).toHaveBeenCalledWith("c1");
  });
});
