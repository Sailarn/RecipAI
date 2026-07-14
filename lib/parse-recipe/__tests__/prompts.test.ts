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
});
