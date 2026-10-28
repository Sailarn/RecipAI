import { describe, expect, it } from "vitest";
import type { StackEntry } from "@/lib/navigation-stack";
import {
  classifyStackChange,
  type DisplayEntry,
  stableEntries,
  topIndex,
  withPopped,
  withPushed,
} from "../display-entries";

function entry(id: string): StackEntry {
  return { id, href: `/${id}`, element: null };
}

function statuses(display: DisplayEntry[]) {
  return display.map((item) => `${item.id}:${item.status}`);
}

const A = entry("a");
const B = entry("b");
const C = entry("c");

describe("classifyStackChange", () => {
  it("detects a push that keeps the existing prefix", () => {
    expect(classifyStackChange([A], [A, B])).toBe("push");
  });

  it("detects a pop back to a prefix", () => {
    expect(classifyStackChange([A, B, C], [A, B])).toBe("pop");
  });

  it("treats anything else as a reset", () => {
    expect(classifyStackChange([A, B], [A, C])).toBe("reset");
    expect(classifyStackChange([A, B], [C, A, B])).toBe("reset");
    expect(classifyStackChange([A], [])).toBe("reset");
  });
});

describe("withPushed", () => {
  it("settles the current pages and slides the new one in", () => {
    const display = withPushed(stableEntries([A]), [A, B]);

    expect(statuses(display)).toEqual(["a:stable", "b:entering"]);
  });

  it("keeps a page that is still sliding out leaving", () => {
    const afterBack = withPopped(stableEntries([A, B]), [A]);

    const display = withPushed(afterBack, [A, C]);

    expect(statuses(display)).toEqual(["a:stable", "b:leaving", "c:entering"]);
  });
});

describe("withPopped", () => {
  it("slides the popped page out", () => {
    const display = withPopped(stableEntries([A, B]), [A]);

    expect(statuses(display)).toEqual(["a:stable", "b:leaving"]);
  });

  it("slides out every page two quick pops removed", () => {
    const firstPop = withPopped(stableEntries([A, B, C]), [A, B]);

    const secondPop = withPopped(firstPop, [A]);

    expect(statuses(secondPop)).toEqual(["a:stable", "b:leaving", "c:leaving"]);
    expect(topIndex(secondPop)).toBe(0);
  });
});

describe("topIndex", () => {
  it("is the last entry that isn't leaving", () => {
    expect(topIndex(withPopped(stableEntries([A, B]), [A]))).toBe(0);
    expect(topIndex(stableEntries([A, B]))).toBe(1);
  });

  it("is -1 when everything is leaving", () => {
    expect(topIndex([{ ...A, status: "leaving" }])).toBe(-1);
  });
});
