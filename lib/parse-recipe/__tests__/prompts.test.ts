import { describe, expect, it } from "vitest";
import {
  buildPhotoPrompt,
  buildTranscriptPrompt,
  buildWebPrompt,
} from "../prompts";

const NOT_RECIPE_RESPONSE = '{"notRecipe": true}';

describe("recipe extraction prompts", () => {
  it.each([
    ["web", buildWebPrompt("page content")],
    ["photo", buildPhotoPrompt()],
    ["video", buildTranscriptPrompt("recipe transcript")],
  ])("instructs the %s extractor to reject non-recipe input", (_, prompt) => {
    expect(prompt).toContain(NOT_RECIPE_RESPONSE);
    expect(prompt).toContain("nothing else");
  });
});
