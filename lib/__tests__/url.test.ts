import { describe, expect, it } from "vitest";
import { extractFirstUrl, isValidUrl } from "@/lib/url";

describe("isValidUrl", () => {
  it("accepts absolute http and https urls", () => {
    expect(isValidUrl("https://silpo.ua/recipes/borscht")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("accepts any host, not only recognized recipe sources", () => {
    expect(isValidUrl("https://some-random-blog.example/post/1")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
    expect(isValidUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects text that is not a url", () => {
    expect(isValidUrl("borscht recipe")).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("silpo.ua/recipes")).toBe(false);
  });
});

describe("extractFirstUrl", () => {
  it("returns a bare url unchanged", () => {
    expect(extractFirstUrl("https://silpo.ua/recipes/borscht")).toBe(
      "https://silpo.ua/recipes/borscht",
    );
  });

  it("finds the link inside share-sheet text", () => {
    const shared = "Best Borscht Ever\n\nhttps://silpo.ua/recipes/borscht";

    expect(extractFirstUrl(shared)).toBe("https://silpo.ua/recipes/borscht");
  });

  it("returns the first link when the text holds several", () => {
    const text = "https://example.com/one and https://example.com/two";

    expect(extractFirstUrl(text)).toBe("https://example.com/one");
  });

  it("strips trailing sentence punctuation", () => {
    expect(extractFirstUrl("Try https://example.com/recipe.")).toBe(
      "https://example.com/recipe",
    );
    expect(extractFirstUrl("(https://example.com/recipe)")).toBe(
      "https://example.com/recipe",
    );
  });

  it("keeps query strings and fragments intact", () => {
    const url = "https://youtube.com/watch?v=abc123&t=90";

    expect(extractFirstUrl(`Watch: ${url}`)).toBe(url);
  });

  it("returns null when there is no link", () => {
    expect(extractFirstUrl("just some copied text")).toBeNull();
    expect(extractFirstUrl("")).toBeNull();
  });

  it("ignores non-http protocols", () => {
    expect(extractFirstUrl("mailto:cook@example.com")).toBeNull();
  });
});
