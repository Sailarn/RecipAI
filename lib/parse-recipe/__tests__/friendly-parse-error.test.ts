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

  it("maps an unsupported platform to a supported-socials message", () => {
    const expected =
      "This social platform is not supported. Try an Instagram, TikTok, YouTube, or X link.";

    expect(friendlyParseError("Unsupported video platform")).toBe(expected);
    expect(friendlyParseError("Unsupported social platform")).toBe(expected);
  });

  it("maps missing social content to a no-recipe message", () => {
    expect(
      friendlyParseError("No caption, transcript, images, or video available"),
    ).toBe(
      "No recipe found — the post has no caption, transcript, images, or video to extract from.",
    );
  });

  it("maps long social videos to a duration-limit message", () => {
    expect(
      friendlyParseError("Social videos must be 30 minutes or shorter"),
    ).toBe(
      "This video is too long to parse. Social videos must be 30 minutes or shorter.",
    );
  });

  it("maps oversized media to a permanent size-limit message", () => {
    expect(friendlyParseError("Video file too large for transcription")).toBe(
      "This video file is too large to transcribe. Try a shorter clip.",
    );
  });

  it("maps missing social posts to a not-found message", () => {
    expect(friendlyParseError("This social post could not be found")).toBe(
      "This social post could not be found. It may have been deleted or the link is invalid.",
    );
  });

  it("maps missing speech/caption to a no-recipe message", () => {
    const expected =
      "No recipe found — the post has no caption, transcript, images, or video to extract from.";
    expect(friendlyParseError("No speech detected")).toBe(expected);
    expect(friendlyParseError("no caption available")).toBe(expected);
  });

  it("maps extraction failures to a scraper-blocked message", () => {
    const expected =
      "Couldn't read this page — the site may block scrapers. Try pasting the URL again or use a different source.";
    expect(friendlyParseError("Could not extract recipe")).toBe(expected);
    expect(friendlyParseError("too little HTML returned")).toBe(expected);
  });

  it("maps AI not-recipe responses from page and social parses to a no-recipe message", () => {
    const expected =
      "No recipe found — the AI couldn't detect a recipe in this content. Try a link that goes directly to a recipe.";
    expect(friendlyParseError("Couldn't extract a recipe from this page")).toBe(
      expected,
    );
    expect(
      friendlyParseError("Couldn't extract a recipe from this social post"),
    ).toBe(expected);
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
    expect(
      isRetriableFailure(friendlyParseError("30 minutes or shorter")),
    ).toBe(false);
    expect(isRetriableFailure(friendlyParseError("Video file too large"))).toBe(
      false,
    );
    expect(
      isRetriableFailure(
        friendlyParseError("This social post could not be found"),
      ),
    ).toBe(false);
    expect(isRetriableFailure(friendlyParseError("No speech detected"))).toBe(
      false,
    );
    expect(
      isRetriableFailure(
        friendlyParseError("Couldn't extract a recipe from this social post"),
      ),
    ).toBe(false);
    expect(
      isRetriableFailure(
        friendlyParseError("Couldn't extract a recipe from this page"),
      ),
    ).toBe(false);
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
