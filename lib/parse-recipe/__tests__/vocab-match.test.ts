import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockToArray } = vi.hoisted(() => ({
  mockToArray: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    ingredients: {
      filter: vi.fn().mockReturnValue({ toArray: mockToArray }),
    },
  },
}));

import { matchVocabId } from "../vocab-match";

function makeEntry(
  id: string,
  en: string,
  ua?: string,
  aliases?: { en?: string[]; ua?: string[] },
) {
  return {
    id,
    en,
    ua: ua ?? null,
    aliasesEn: aliases?.en ?? [],
    aliasesUa: aliases?.ua ?? [],
    status: "confirmed" as const,
    embedding: null,
    category: null,
    retryCount: 0,
    lastAttemptAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("matchVocabId", () => {
  describe("tie-break: slug ids beat uuid ids on identical text", () => {
    it("returns the slug id when a uuid entry and a slug entry both match the same word (uuid listed first)", async () => {
      mockToArray.mockResolvedValue([
        makeEntry("3a4b5c6d-1111-4444-aaaa-ef0123456789", "salt", "сіль"),
        makeEntry("salt", "salt", "сіль"),
      ]);

      const result = await matchVocabId("salt");

      expect(result).toBe("salt");
    });

    it("returns the uuid id when no slug entry exists for a word (no tie)", async () => {
      // 3 entries — different vocab length busts the in-memory fuse cache
      mockToArray.mockResolvedValue([
        makeEntry("ade1f14a-2222-4444-bbbb-000000000001", "flour", "борошно"),
        makeEntry("garlic", "garlic", "часник"),
        makeEntry("butter", "butter", "вершкове масло"),
      ]);

      const result = await matchVocabId("flour");

      expect(result).toBe("ade1f14a-2222-4444-bbbb-000000000001");
    });

    it("returns null when no vocab entry matches", async () => {
      // 4 entries — bust cache again
      mockToArray.mockResolvedValue([
        makeEntry("salt", "salt", "сіль"),
        makeEntry("garlic", "garlic", "часник"),
        makeEntry("butter", "butter", "вершкове масло"),
        makeEntry("egg", "egg", "яйце"),
      ]);

      const result = await matchVocabId("xylophone");

      expect(result).toBeNull();
    });
  });

  describe("ua fallback", () => {
    it("resolves via ua text when the en text does not match", async () => {
      // 5 entries — bust cache
      mockToArray.mockResolvedValue([
        makeEntry("salt", "salt", "сіль"),
        makeEntry("garlic", "garlic", "часник"),
        makeEntry("butter", "butter", "вершкове масло"),
        makeEntry("egg", "egg", "яйце"),
        makeEntry("pepper", "pepper", "перець"),
      ]);

      const result = await matchVocabId("unknown-xyz", "перець");

      expect(result).toBe("pepper");
    });
  });

  describe("en head key", () => {
    it("resolves via the en head when the item string itself does not match", async () => {
      // 6 entries — bust cache
      mockToArray.mockResolvedValue([
        makeEntry("salt", "salt", "сіль"),
        makeEntry("garlic", "garlic", "часник"),
        makeEntry("butter", "butter", "вершкове масло"),
        makeEntry("egg", "egg", "яйце"),
        makeEntry("pepper", "pepper", "перець"),
        makeEntry("mozzarella", "mozzarella", "моцарела"),
      ]);

      const result = await matchVocabId(
        "latticini freschi grattugiati",
        null,
        "mozzarella",
      );

      expect(result).toBe("mozzarella");
    });
  });
});
