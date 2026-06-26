import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

vi.mock("@/lib/video-url", () => ({
  isSocialUrl: vi.fn(),
}));

vi.mock("../video", () => ({
  parseVideoRecipe: vi.fn(),
}));

vi.mock("../web", () => ({
  parseWebRecipe: vi.fn(),
}));

import { isSocialUrl } from "@/lib/video-url";
import { parseRecipeFromUrl } from "../index";
import { parseVideoRecipe } from "../video";
import { parseWebRecipe } from "../web";

const mockRecipe: ParsedRecipe = {
  title: "Test Recipe",
  servings: 2,
  ingredients: [],
  instructions: [],
  sourceUrl: "https://example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseRecipeFromUrl", () => {
  it("calls parseVideoRecipe for social URLs", async () => {
    vi.mocked(isSocialUrl).mockReturnValue(true);
    vi.mocked(parseVideoRecipe).mockResolvedValue(mockRecipe);

    const result = await parseRecipeFromUrl(
      "https://www.instagram.com/reel/ABC/",
    );

    expect(parseVideoRecipe).toHaveBeenCalledWith(
      "https://www.instagram.com/reel/ABC/",
    );
    expect(parseWebRecipe).not.toHaveBeenCalled();
    expect(result).toEqual(mockRecipe);
  });

  it("calls parseWebRecipe for non-social URLs", async () => {
    vi.mocked(isSocialUrl).mockReturnValue(false);
    vi.mocked(parseWebRecipe).mockResolvedValue(mockRecipe);

    const result = await parseRecipeFromUrl("https://example.com/recipe");

    expect(parseWebRecipe).toHaveBeenCalledWith("https://example.com/recipe");
    expect(parseVideoRecipe).not.toHaveBeenCalled();
    expect(result).toEqual(mockRecipe);
  });
});
