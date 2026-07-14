import { describe, expect, it } from "vitest";
import {
  isPreparationModifier,
  modifierLabel,
  modifierPromptList,
  PREPARATION_MODIFIERS,
} from "../modifiers";

describe("modifiers", () => {
  it("every entry has en and ua labels", () => {
    for (const entry of Object.values(PREPARATION_MODIFIERS)) {
      expect(entry.en.length).toBeGreaterThan(0);
      expect(entry.ua.length).toBeGreaterThan(0);
    }
  });

  it("isPreparationModifier accepts known keys and rejects others", () => {
    expect(isPreparationModifier("GRATED")).toBe(true);
    expect(isPreparationModifier("grated")).toBe(false);
    expect(isPreparationModifier("BANANA")).toBe(false);
    expect(isPreparationModifier("toString")).toBe(false);
  });

  it("modifierLabel resolves by locale", () => {
    expect(modifierLabel("GRATED", "en")).toBe("grated");
    expect(modifierLabel("GRATED", "ua")).toBe("тертий");
  });

  it("modifierPromptList joins keys with pipes for the prompt", () => {
    const list = modifierPromptList();
    expect(list).toContain("GRATED");
    expect(list).toContain(" | ");
    expect(list.split(" | ").length).toBe(
      Object.keys(PREPARATION_MODIFIERS).length,
    );
  });
});
