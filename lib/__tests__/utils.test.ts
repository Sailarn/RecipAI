import { describe, expect, it } from "vitest";
import { cn } from "../utils";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "nope", "yes")).toBe("base yes");
    expect(cn("base", true && "included")).toBe("base included");
  });

  it("ignores undefined and null", () => {
    expect(cn("foo", undefined, null as any, "bar")).toBe("foo bar");
  });

  it("returns empty string when no classes given", () => {
    expect(cn()).toBe("");
  });
});
