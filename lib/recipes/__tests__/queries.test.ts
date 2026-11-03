import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { escapeLike, searchTerms } from "../queries";

describe("escapeLike", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
});

describe("searchTerms", () => {
  it("splits, lowercases and de-duplicates words", () => {
    expect(searchTerms("  Chicken   SOUP chicken ")).toEqual([
      "chicken",
      "soup",
    ]);
  });

  it("caps the number of terms", () => {
    expect(searchTerms("a b c d e f g h i j")).toHaveLength(8);
  });

  it("returns nothing for an empty query", () => {
    expect(searchTerms(undefined)).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
  });
});
