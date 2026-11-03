import { describe, expect, it } from "vitest";
import { isNetworkFailure } from "../network-error";

describe("isNetworkFailure", () => {
  it.each([
    "Load failed",
    "Failed to fetch",
    "Failed to fetch (recip-ai-wine.vercel.app)",
    "NetworkError when attempting to fetch resource.",
    "The network connection was lost.",
    "The Internet connection appears to be offline.",
  ])("recognises a browser network failure: %s", (message) => {
    expect(isNetworkFailure(new TypeError(message))).toBe(true);
  });

  it("recognises an aborted request", () => {
    expect(isNetworkFailure(new DOMException("aborted", "AbortError"))).toBe(
      true,
    );
  });

  it("keeps real errors reportable", () => {
    expect(isNetworkFailure(new Error("Server sync failed"))).toBe(false);
    expect(isNetworkFailure(new TypeError("x is not a function"))).toBe(false);
    expect(isNetworkFailure(new Error("Failed to fetch"))).toBe(false);
    expect(isNetworkFailure("Load failed")).toBe(false);
  });
});
