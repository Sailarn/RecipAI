import { describe, expect, it } from "vitest";
import {
  doneParseHistoryEntry,
  failedParseHistoryEntry,
} from "../parse-history-entry";

describe("doneParseHistoryEntry", () => {
  it("builds a done entry with the recipe title and url", () => {
    const entry = doneParseHistoryEntry(
      "job-1",
      "Pasta",
      "https://example.com/pasta",
    );

    expect(entry).toMatchObject({
      id: "job-1",
      title: "Pasta",
      status: "done",
      url: "https://example.com/pasta",
    });
    expect(entry.reason).toBeUndefined();
    expect(entry.createdAt).toBeInstanceOf(Date);
  });
});

describe("failedParseHistoryEntry", () => {
  it("uses the host (without www) as the title", () => {
    const entry = failedParseHistoryEntry(
      "job-2",
      "https://www.instagram.com/reel/abc",
      "restricted",
    );

    expect(entry.title).toBe("instagram.com");
    expect(entry.status).toBe("failed");
    expect(entry.url).toBe("https://www.instagram.com/reel/abc");
  });

  it("maps the raw error to a friendly reason", () => {
    const entry = failedParseHistoryEntry("job-3", "https://x.com", "503");

    expect(entry.reason).toBe(
      "Gemini is experiencing high demand right now. Please try again in a moment.",
    );
  });

  it("falls back to the raw url when it can't be parsed as a host", () => {
    const entry = failedParseHistoryEntry("job-4", "not a url", "boom");

    expect(entry.title).toBe("not a url");
  });
});
