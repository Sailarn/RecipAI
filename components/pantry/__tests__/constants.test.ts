import { describe, expect, it } from "vitest";
import { mapVocabCategory } from "../constants";

describe("mapVocabCategory", () => {
  it.each([
    ["vegetable", "Produce"],
    ["fruit", "Produce"],
    ["dairy", "Dairy"],
    ["egg", "Dairy"],
    ["grain", "Pantry"],
    ["legume", "Pantry"],
    ["nut", "Pantry"],
    ["oil", "Pantry"],
    ["sauce", "Pantry"],
    ["seed", "Pantry"],
    ["sweetener", "Pantry"],
    ["herb", "Spices"],
    ["spice", "Spices"],
    ["alcohol", "Other"],
    ["meat", "Other"],
    ["seafood", "Other"],
    ["other", "Other"],
  ])("maps the %s vocabulary category to %s", (source, expected) => {
    expect(mapVocabCategory(source)).toBe(expected);
  });

  it("normalizes category casing", () => {
    expect(mapVocabCategory("Vegetable")).toBe("Produce");
  });
});
