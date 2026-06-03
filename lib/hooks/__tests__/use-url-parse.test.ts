import { describe, expect, it } from "vitest";
import { friendlyParseError } from "../use-url-parse";

describe("friendlyParseError", () => {
  it("maps 503 / Service Unavailable / high demand to a high-demand message", () => {
    const expected =
      "Gemini is experiencing high demand right now. Please try again in a moment.";
    expect(friendlyParseError("Error 503")).toBe(expected);
    expect(friendlyParseError("Service Unavailable")).toBe(expected);
    expect(friendlyParseError("model is under high demand")).toBe(expected);
  });

  it("maps 429 / quota to a quota-exceeded message", () => {
    const expected = "API quota exceeded. Please try again later.";
    expect(friendlyParseError("HTTP 429")).toBe(expected);
    expect(friendlyParseError("quota reached")).toBe(expected);
  });

  it("maps extraction failures to a scraper-blocked message", () => {
    const expected =
      "Couldn't read this page — the site may block scrapers. Try pasting the URL again or use a different source.";
    expect(friendlyParseError("Could not extract recipe")).toBe(expected);
    expect(friendlyParseError("too little HTML returned")).toBe(expected);
  });

  it("passes through an unrecognized error unchanged", () => {
    expect(friendlyParseError("Something unexpected")).toBe(
      "Something unexpected",
    );
  });

  it("prioritizes the high-demand branch when multiple patterns match", () => {
    expect(friendlyParseError("503 quota")).toBe(
      "Gemini is experiencing high demand right now. Please try again in a moment.",
    );
  });
});
