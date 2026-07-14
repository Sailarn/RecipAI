import { describe, expect, it } from "vitest";
import { buildSectionsFromLabels, sectionIdForLabel } from "../build-sections";

describe("buildSectionsFromLabels", () => {
  it("returns no sections when every label is null", () => {
    const { sections, sectionIdByLabel } = buildSectionsFromLabels(
      [null, null],
      [null],
    );

    expect(sections).toEqual([]);
    expect(sectionIdByLabel.size).toBe(0);
  });

  it("creates one section per distinct label, in first-appearance order", () => {
    let counter = 0;
    const nextId = () => `id-${counter++}`;

    const { sections } = buildSectionsFromLabels(
      ["For the base", "Sauce", "For the base"],
      ["Sauce"],
      nextId,
    );

    expect(sections).toEqual([
      { id: "id-0", name: "For the base", order: 0 },
      { id: "id-1", name: "Sauce", order: 1 },
    ]);
  });

  it("scans ingredients before steps so an ingredient-only label wins the id", () => {
    let counter = 0;
    const nextId = () => `id-${counter++}`;

    const { sectionIdByLabel } = buildSectionsFromLabels(
      ["For the dough"],
      ["For the dough"],
      nextId,
    );

    expect(sectionIdByLabel.get("For the dough")).toBe("id-0");
  });

  it("trims labels and ignores empty strings", () => {
    const { sections } = buildSectionsFromLabels(["  For the base  ", ""], []);

    expect(sections).toEqual([
      { id: expect.any(String), name: "For the base", order: 0 },
    ]);
  });
});

describe("sectionIdForLabel", () => {
  it("resolves a known label", () => {
    const map = new Map([["Sauce", "sec-1"]]);

    expect(sectionIdForLabel("Sauce", map)).toBe("sec-1");
  });

  it("returns null for an unknown or empty label", () => {
    const map = new Map([["Sauce", "sec-1"]]);

    expect(sectionIdForLabel("Marinade", map)).toBeNull();
    expect(sectionIdForLabel(null, map)).toBeNull();
    expect(sectionIdForLabel("", map)).toBeNull();
  });
});
