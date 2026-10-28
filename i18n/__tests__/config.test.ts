import { describe, expect, it } from "vitest";
import { toLocale } from "../config";

describe("toLocale", () => {
  it("accepts a supported locale", () => {
    expect(toLocale("en")).toBe("en");
    expect(toLocale("uk")).toBe("uk");
  });

  it("reads the old ua code as Ukrainian", () => {
    expect(toLocale("ua")).toBe("uk");
  });

  it("returns null for anything else", () => {
    expect(toLocale("de")).toBeNull();
    expect(toLocale("")).toBeNull();
    expect(toLocale(null)).toBeNull();
    expect(toLocale(undefined)).toBeNull();
  });
});
