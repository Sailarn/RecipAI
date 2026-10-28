import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCallAi } = vi.hoisted(() => ({ mockCallAi: vi.fn() }));

vi.mock("@/lib/ai", () => ({ callAiForRecipe: mockCallAi }));
vi.mock("@/lib/telemetry", () => ({ log: vi.fn() }));

import { MAX_RECIPE_TEXT_CHARS } from "@/lib/parse-recipe/text";
import { extractRecipeFromText, looksLikeRecipeText } from "../text-extract";

const RECIPE_TEXT = "Pancakes: 200 g flour, 2 eggs, milk. Mix and fry.";

beforeEach(() => {
  vi.clearAllMocks();
  mockCallAi.mockResolvedValue({ title: "Pancakes" });
});

describe("looksLikeRecipeText", () => {
  describe("accepts", () => {
    it.each([
      ["a recipe with amounts", RECIPE_TEXT],
      [
        "a recipe without digits but with list lines",
        "Борщ\n- буряк\n- капуста\n- картопля\nВарити до готовності",
      ],
      [
        "a few plain lines",
        "Omelette\nbeat eggs with salt\nfry in butter until set",
      ],
      [
        "a chat answer with a link inside",
        "Here is the recipe from https://example.com:\n1. Boil 2 l water",
      ],
    ])("%s", (_label, text) => {
      expect(looksLikeRecipeText(text)).toBe(true);
    });
  });

  describe("rejects", () => {
    it.each([
      ["a bare link", "https://example.com/recipes/borscht"],
      ["several bare links", "https://a.com/x\nhttps://b.com/y"],
      ["symbol noise", "!!!! ???? #### $$$$ %%%% @@@@ 1"],
      [
        "a single line of prose without numbers",
        "I really like cooking at home",
      ],
    ])("%s", (_label, text) => {
      expect(looksLikeRecipeText(text)).toBe(false);
    });
  });
});

describe("extractRecipeFromText", () => {
  it("answers not-a-recipe without calling the model for rejected text", async () => {
    const result = await extractRecipeFromText("https://example.com/recipe");

    expect(result).toEqual({ notRecipe: true });
    expect(mockCallAi).not.toHaveBeenCalled();
  });

  it("sends accepted text to the model", async () => {
    const result = await extractRecipeFromText(RECIPE_TEXT);

    expect(result).toEqual({ title: "Pancakes" });
    expect(mockCallAi).toHaveBeenCalledWith(
      expect.stringContaining(RECIPE_TEXT),
    );
  });

  it("caps the text sent to the model", async () => {
    const longText = `${RECIPE_TEXT}\n`.repeat(2000);

    await extractRecipeFromText(longText);

    const prompt: string = mockCallAi.mock.calls[0][0];
    expect(prompt).toContain(longText.slice(0, MAX_RECIPE_TEXT_CHARS));
    expect(prompt).not.toContain(longText.slice(0, MAX_RECIPE_TEXT_CHARS + 1));
  });
});
