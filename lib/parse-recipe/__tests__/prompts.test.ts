import { describe, expect, it } from "vitest";
import {
  buildPhotoPrompt,
  buildSocialPrompt,
  buildWebPrompt,
} from "../prompts";

const NOT_RECIPE_RESPONSE = '{"notRecipe": true}';

describe("recipe extraction prompts", () => {
  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])("instructs the %s extractor to reject non-recipe input", (_, prompt) => {
    expect(prompt).toContain(NOT_RECIPE_RESPONSE);
    expect(prompt).toContain("nothing else");
  });

  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])("limits AI-generated %s modifiers to zero or one key", (_, prompt) => {
    expect(prompt).toContain("choose zero or one modifier per ingredient");
    expect(prompt).not.toContain(
      "choose zero or more modifiers per ingredient",
    );
  });

  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])(
    "instructs the %s extractor to convert units to metric and forbids imperial units",
    (_, prompt) => {
      expect(prompt).toContain("metric only, mandatory");
      expect(prompt).toContain("oz -> g");
      expect(prompt).toContain("NEVER cup, oz, lb, fl oz, pint, quart");
    },
  );

  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])(
    "instructs the %s extractor to keep tbsp/tsp amounts as-is instead of converting them to grams",
    (_, prompt) => {
      expect(prompt).toContain("do not convert them to grams");
      expect(prompt).toContain("measured by CUPS");
    },
  );

  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])(
    "instructs the %s extractor to split a compound ingredient line into one object per item",
    (_, prompt) => {
      expect(prompt).toContain("salt, pepper, chicken seasoning");
      expect(prompt).toContain("one ingredient object PER item");
      expect(prompt).toContain("either/or choice");
    },
  );

  it("instructs the item/modifiers schema to recognize noun-after preparation words", () => {
    const prompt = buildWebPrompt("page content");

    expect(prompt).toContain("lamb mince");
    expect(prompt).toContain("MINCED in modifiers");
  });

  it("instructs the en field to stay singular even for a plural source noun", () => {
    const prompt = buildWebPrompt("page content");

    expect(prompt).toContain("2 eggs");
    expect(prompt).toContain('NEVER "eggs"');
  });

  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])(
    "instructs the %s extractor to normalize display language to Ukrainian or English based on the source",
    (_, prompt) => {
      expect(prompt).toContain("if the source is Ukrainian or Russian");
      expect(prompt).toContain("write everything in Ukrainian");
      expect(prompt).toContain("write everything in English");
    },
  );

  it("does not tell the photo extractor to leave text untranslated (superseded by the language rule)", () => {
    const prompt = buildPhotoPrompt();

    expect(prompt).not.toContain("do NOT translate");
  });

  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    [
      "social",
      buildSocialPrompt(
        { platform: "youtube", imageUrls: [] },
        "recipe transcript",
      ),
    ],
  ])(
    "instructs the %s extractor that a '(for serving)' annotation doesn't make an ingredient sectionless",
    (_, prompt) => {
      expect(prompt).toContain("(for serving)");
      expect(prompt).toContain("для подачі");
      expect(prompt).toContain("does not make the ingredient sectionless");
    },
  );
});
