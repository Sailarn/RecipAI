import { describe, expect, it } from "vitest";
import {
  groupBySectionId,
  groupBySectionRuns,
  sectionName,
  shouldShowSections,
} from "../recipe-sections";

describe("groupBySectionId", () => {
  it("emits each catalog section once, ungrouped last", () => {
    const groups = groupBySectionId(
      [
        { id: "a", sectionId: "s1" },
        { id: "b", sectionId: "s1" },
        { id: "c", sectionId: "s2" },
        { id: "d", sectionId: null },
      ],
      [
        { id: "s1", name: "Dough", order: 0 },
        { id: "s2", name: "Sauce", order: 1 },
      ],
    );

    expect(groups).toEqual([
      {
        sectionId: "s1",
        items: [
          { id: "a", sectionId: "s1" },
          { id: "b", sectionId: "s1" },
        ],
      },
      { sectionId: "s2", items: [{ id: "c", sectionId: "s2" }] },
      { sectionId: null, items: [{ id: "d", sectionId: null }] },
    ]);
  });

  it("treats undefined sectionId the same as null", () => {
    const groups = groupBySectionId(
      [{ id: "a" }, { id: "b", sectionId: null }],
      undefined,
    );

    expect(groups).toEqual([
      { sectionId: null, items: [{ id: "a" }, { id: "b", sectionId: null }] },
    ]);
  });

  it("coalesces interleaved sections in catalog order with ungrouped items last", () => {
    const groups = groupBySectionId(
      [
        { id: "a", sectionId: "s1" },
        { id: "b", sectionId: null },
        { id: "c", sectionId: "s2" },
        { id: "d", sectionId: "s1" },
        { id: "e" },
      ],
      [
        { id: "s2", name: "Sauce", order: 0 },
        { id: "s1", name: "Dough", order: 1 },
      ],
    );

    expect(groups).toEqual([
      { sectionId: "s2", items: [{ id: "c", sectionId: "s2" }] },
      {
        sectionId: "s1",
        items: [
          { id: "a", sectionId: "s1" },
          { id: "d", sectionId: "s1" },
        ],
      },
      {
        sectionId: null,
        items: [{ id: "b", sectionId: null }, { id: "e" }],
      },
    ]);
  });
});

describe("groupBySectionRuns", () => {
  it("preserves order, starting a fresh run each time the section changes", () => {
    const groups = groupBySectionRuns([
      { id: "a", sectionId: "s1" },
      { id: "b", sectionId: null },
      { id: "c", sectionId: "s1" },
      { id: "d", sectionId: "s1" },
    ]);

    expect(groups).toEqual([
      { sectionId: "s1", items: [{ id: "a", sectionId: "s1" }] },
      { sectionId: null, items: [{ id: "b", sectionId: null }] },
      {
        sectionId: "s1",
        items: [
          { id: "c", sectionId: "s1" },
          { id: "d", sectionId: "s1" },
        ],
      },
    ]);
  });

  it("treats undefined sectionId the same as null", () => {
    const groups = groupBySectionRuns([
      { id: "a" },
      { id: "b", sectionId: null },
    ]);

    expect(groups).toEqual([
      {
        sectionId: null,
        items: [{ id: "a" }, { id: "b", sectionId: null }],
      },
    ]);
  });
});

describe("sectionName", () => {
  const sections = [
    { id: "s1", name: "For the base", order: 0 },
    { id: "s2", name: "Sauce", order: 1 },
  ];

  it("resolves a known sectionId", () => {
    expect(sectionName("s2", sections)).toBe("Sauce");
  });

  it("returns null for a null sectionId", () => {
    expect(sectionName(null, sections)).toBeNull();
  });

  it("returns null for an unknown sectionId or missing sections list", () => {
    expect(sectionName("missing", sections)).toBeNull();
    expect(sectionName("s1", undefined)).toBeNull();
  });
});

describe("shouldShowSections", () => {
  it("is false when all items are in the same group", () => {
    expect(shouldShowSections([null, null])).toBe(false);
    expect(shouldShowSections(["s1", "s1"])).toBe(false);
  });

  it("is true with named and ungrouped items", () => {
    expect(shouldShowSections(["s1", "s1", null])).toBe(true);
  });

  it("is true with more than one named section", () => {
    expect(shouldShowSections(["s1", "s2"])).toBe(true);
  });
});
