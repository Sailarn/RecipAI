import { describe, expect, it } from "vitest";
import { normalizeSourceUrl } from "../normalize-url";

describe("normalizeSourceUrl", () => {
  it("strips Instagram share tracking so the same reel collapses to one key", () => {
    const withTracking =
      "https://www.instagram.com/reel/ABC123/?igshid=xyz&utm_source=ig_web";
    const clean = "https://instagram.com/reel/ABC123";

    expect(normalizeSourceUrl(withTracking)).toBe(clean);
    expect(normalizeSourceUrl("https://instagram.com/reel/ABC123/")).toBe(
      clean,
    );
  });

  it("drops utm_* and click-id params but keeps content params", () => {
    expect(
      normalizeSourceUrl(
        "https://youtube.com/watch?v=abc123&utm_medium=share&fbclid=1&si=2",
      ),
    ).toBe("https://youtube.com/watch?v=abc123");
  });

  it("folds www./m. and lowercases the host but preserves path case", () => {
    expect(normalizeSourceUrl("https://M.Example.COM/Recipes/Borsch")).toBe(
      "https://example.com/Recipes/Borsch",
    );
  });

  it("sorts remaining query params so order does not matter", () => {
    expect(normalizeSourceUrl("https://example.com/r?b=2&a=1")).toBe(
      "https://example.com/r?a=1&b=2",
    );
  });

  it("drops the fragment and trailing slash, forces https", () => {
    expect(normalizeSourceUrl("http://example.com/recipe/#jump")).toBe(
      "https://example.com/recipe",
    );
  });

  it("collapses Instagram reel/reels/p/tv variants of the same media to one key", () => {
    const canonical = "https://instagram.com/reel/Cz5cvz1OF3Q";

    expect(
      normalizeSourceUrl("https://www.instagram.com/reels/Cz5cvz1OF3Q/"),
    ).toBe(canonical);
    expect(
      normalizeSourceUrl(
        "https://instagram.com/reel/Cz5cvz1OF3Q/?igsh=MTBxNG5t",
      ),
    ).toBe(canonical);
    expect(normalizeSourceUrl("https://m.instagram.com/p/Cz5cvz1OF3Q")).toBe(
      canonical,
    );
    expect(normalizeSourceUrl("https://instagram.com/tv/Cz5cvz1OF3Q/")).toBe(
      canonical,
    );
  });

  it("returns the trimmed input unchanged when it is not a valid URL", () => {
    expect(normalizeSourceUrl("  not a url  ")).toBe("not a url");
  });
});
