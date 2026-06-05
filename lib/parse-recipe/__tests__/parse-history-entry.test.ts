import { describe, expect, it } from "vitest";
import {
  doneParseHistoryEntry,
  donePhotoHistoryEntry,
  failedParseHistoryEntry,
  failedPhotoHistoryEntry,
  parseHistoryEntryFromServerJob,
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

describe("photo history entries", () => {
  it("builds a done photo entry with no url", () => {
    const entry = donePhotoHistoryEntry("Grandma's Soup");

    expect(entry).toMatchObject({ title: "Grandma's Soup", status: "done" });
    expect(entry.url).toBeUndefined();
    expect(typeof entry.id).toBe("string");
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it("builds a failed photo entry with a friendly reason and no url", () => {
    const entry = failedPhotoHistoryEntry("503");

    expect(entry.status).toBe("failed");
    expect(entry.title).toBe("Photo import");
    expect(entry.url).toBeUndefined();
    expect(entry.reason).toBe(
      "Gemini is experiencing high demand right now. Please try again in a moment.",
    );
  });
});

describe("parseHistoryEntryFromServerJob", () => {
  it("maps a done job, preserving the server createdAt", () => {
    const entry = parseHistoryEntryFromServerJob({
      id: "job-1",
      url: "https://example.com/pasta",
      status: "done",
      result: { title: "Pasta", sourceUrl: "https://src.example.com/pasta" },
      error: null,
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    expect(entry).toMatchObject({
      id: "job-1",
      title: "Pasta",
      status: "done",
      url: "https://src.example.com/pasta",
    });
    expect(entry?.createdAt).toEqual(new Date("2026-01-02T00:00:00.000Z"));
  });

  it("maps a failed job with a host title and friendly reason", () => {
    const entry = parseHistoryEntryFromServerJob({
      id: "job-2",
      url: "https://www.instagram.com/reel/x",
      status: "failed",
      result: null,
      error: "restricted",
      createdAt: "2026-01-03T00:00:00.000Z",
    });

    expect(entry?.status).toBe("failed");
    expect(entry?.title).toBe("instagram.com");
    expect(entry?.reason).toContain("private or the content is restricted");
  });

  it("returns null for a non-terminal job", () => {
    const entry = parseHistoryEntryFromServerJob({
      id: "job-3",
      url: "https://example.com",
      status: "pending",
      result: null,
      error: null,
      createdAt: "2026-01-04T00:00:00.000Z",
    });

    expect(entry).toBeNull();
  });
});
