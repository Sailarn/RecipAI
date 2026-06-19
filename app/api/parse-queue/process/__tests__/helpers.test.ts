import { describe, expect, it, vi } from "vitest";
import { classifyParseError, isRetryable, parseWithRetry } from "../helpers";

describe("classifyParseError", () => {
  it("returns private account message for restricted_page errors", () => {
    const err = new Error("This reel is restricted and cannot be accessed.");
    expect(classifyParseError(err)).toContain("private");
  });

  it("returns private account message when message includes 'private'", () => {
    const err = new Error("Account is private");
    expect(classifyParseError(err)).toContain("private");
  });

  it("returns platform message for unsupported video platform", () => {
    const err = new Error(
      "Unsupported video platform. Currently only Instagram Reels are supported.",
    );
    expect(classifyParseError(err)).toContain("Instagram");
  });

  it("returns speech message when no transcript and no caption", () => {
    const err = new Error(
      "No speech detected in video and no caption available.",
    );
    expect(classifyParseError(err)).toContain("speech");
  });

  it("returns page message when text extraction fails", () => {
    const err = new Error("Could not extract enough text from page");
    expect(classifyParseError(err)).toContain("page");
  });

  it("returns generic message for unknown errors", () => {
    const err = new Error("Some unexpected network blip");
    expect(classifyParseError(err)).toContain("❌");
  });

  it("handles non-Error thrown values", () => {
    expect(classifyParseError("string error")).toContain("❌");
    expect(classifyParseError(null)).toContain("❌");
  });
});

describe("isRetryable", () => {
  it("returns false for restricted / private errors", () => {
    expect(
      isRetryable(new Error("This reel is restricted and cannot be accessed.")),
    ).toBe(false);
    expect(isRetryable(new Error("Account is private"))).toBe(false);
  });

  it("returns false for unsupported video platform", () => {
    expect(isRetryable(new Error("Unsupported video platform"))).toBe(false);
  });

  it("returns false when no speech and no caption", () => {
    expect(
      isRetryable(
        new Error("No speech detected in video and no caption available."),
      ),
    ).toBe(false);
  });

  it("returns false when token is not configured", () => {
    expect(isRetryable(new Error("APIFY_TOKEN not configured"))).toBe(false);
    expect(isRetryable(new Error("SCRAPE_DO_TOKEN not configured"))).toBe(
      false,
    );
  });

  it("returns true for transient network / timeout errors", () => {
    expect(isRetryable(new Error("fetch failed: Connection reset"))).toBe(true);
    expect(isRetryable(new Error("PhantomJsCloud error: 504"))).toBe(true);
    expect(isRetryable(new Error("Gemini API timeout"))).toBe(true);
  });
});

// delayMs=0 throughout so no fake timers needed — delay still goes through
// the event loop but resolves immediately.
describe("parseWithRetry", () => {
  it("returns result when parse succeeds on first attempt", async () => {
    const parseFn = vi.fn().mockResolvedValue({ title: "Pasta" });

    const result = await parseWithRetry(parseFn, "https://example.com", 2, 0);

    expect(result).toEqual({ title: "Pasta" });
    expect(parseFn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and returns result on second attempt", async () => {
    const parseFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("PhantomJsCloud error: 504"))
      .mockResolvedValue({ title: "Pasta" });

    const result = await parseWithRetry(parseFn, "https://example.com", 2, 0);

    expect(result).toEqual({ title: "Pasta" });
    expect(parseFn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable error", async () => {
    const err = new Error("This reel is restricted and cannot be accessed.");
    const parseFn = vi.fn().mockRejectedValue(err);

    await expect(
      parseWithRetry(parseFn, "https://example.com", 2, 0),
    ).rejects.toThrow("restricted");

    expect(parseFn).toHaveBeenCalledTimes(1);
  });

  it("throws last error after all attempts are exhausted", async () => {
    const parseFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout attempt 1"))
      .mockRejectedValueOnce(new Error("timeout attempt 2"));

    await expect(
      parseWithRetry(parseFn, "https://example.com", 2, 0),
    ).rejects.toThrow("timeout attempt 2");

    expect(parseFn).toHaveBeenCalledTimes(2);
  });

  it("passes the url through to parseFn", async () => {
    const parseFn = vi.fn().mockResolvedValue({ title: "Pasta" });

    await parseWithRetry(parseFn, "https://example.com/reel", 2, 0);

    expect(parseFn).toHaveBeenCalledWith("https://example.com/reel");
  });
});
