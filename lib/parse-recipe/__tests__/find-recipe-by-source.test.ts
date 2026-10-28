import { beforeEach, describe, expect, it, vi } from "vitest";

const orderBy = vi.hoisted(() => vi.fn());
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ orderBy }) }) }) },
}));

import { findRecipeIdBySource } from "../find-recipe-by-source";

beforeEach(() => {
  orderBy.mockResolvedValue([
    { id: "newest", sourceUrl: "https://www.instagram.com/p/ABC/?igsh=1" },
    { id: "other", sourceUrl: "https://example.com/soup" },
    { id: "older", sourceUrl: "https://instagram.com/reel/ABC" },
  ]);
});

describe("findRecipeIdBySource", () => {
  it("matches the same link in another form, newest first", async () => {
    expect(
      await findRecipeIdBySource("u1", "https://instagram.com/reels/ABC/"),
    ).toBe("newest");
  });

  it("finds nothing for a link the user never imported", async () => {
    expect(
      await findRecipeIdBySource("u1", "https://example.com/stew"),
    ).toBeNull();
  });
});
