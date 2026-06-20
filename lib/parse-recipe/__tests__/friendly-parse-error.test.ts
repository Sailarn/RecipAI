import { describe, expect, it } from "vitest";
import {
  friendlyParseError,
  isRetriableFailure,
} from "../friendly-parse-error";

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

  it("maps restricted / private to a privacy message", () => {
    const expected =
      "This account is private or the content is restricted — only public posts can be parsed.";
    expect(friendlyParseError("account is private")).toBe(expected);
    expect(friendlyParseError("restricted_page")).toBe(expected);
  });

  it("maps an unsupported platform to an Instagram-only message", () => {
    expect(friendlyParseError("Unsupported video platform")).toBe(
      "Only Instagram Reels are supported. Try an Instagram link.",
    );
  });

  it("maps missing speech/caption to a no-recipe message", () => {
    const expected =
      "No recipe found — the video has no speech or caption to extract from.";
    expect(friendlyParseError("No speech detected")).toBe(expected);
    expect(friendlyParseError("no caption available")).toBe(expected);
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

describe("isRetriableFailure", () => {
  it("marks private/restricted, unsupported platform and no-content as permanent", () => {
    expect(isRetriableFailure(friendlyParseError("account is private"))).toBe(
      false,
    );
    expect(
      isRetriableFailure(friendlyParseError("Unsupported video platform")),
    ).toBe(false);
    expect(isRetriableFailure(friendlyParseError("No speech detected"))).toBe(
      false,
    );
  });

  it("marks transient and scraper-blocked failures as retriable", () => {
    expect(isRetriableFailure(friendlyParseError("Error 503"))).toBe(true);
    expect(isRetriableFailure(friendlyParseError("HTTP 429"))).toBe(true);
    expect(
      isRetriableFailure(friendlyParseError("Could not extract recipe")),
    ).toBe(true);
  });

  it("treats unknown and missing reasons as retriable", () => {
    expect(isRetriableFailure("Something unexpected")).toBe(true);
    expect(isRetriableFailure(undefined)).toBe(true);
  });
});
