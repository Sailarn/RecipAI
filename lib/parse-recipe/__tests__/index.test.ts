import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/video-url", () => ({
  isVideoUrl: vi.fn(),
}));

vi.mock("../video", () => ({
  parseVideoRecipe: vi.fn(),
}));

vi.mock("../web", () => ({
  parseWebRecipe: vi.fn(),
}));

import { isVideoUrl } from "@/lib/video-url";
import { parseRecipeFromUrl } from "../index";
import { parseVideoRecipe } from "../video";
import { parseWebRecipe } from "../web";

const mockRecipe = {
  title: "Test Recipe",
  servings: 2,
  ingredients: [],
  instructions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("parseRecipeFromUrl", () => {
  it("calls parseVideoRecipe for video URLs", async () => {
    vi.mocked(isVideoUrl).mockReturnValue(true);
    vi.mocked(parseVideoRecipe).mockResolvedValue(mockRecipe as any);

    const result = await parseRecipeFromUrl(
      "https://www.instagram.com/reel/ABC/",
    );

    expect(parseVideoRecipe).toHaveBeenCalledWith(
      "https://www.instagram.com/reel/ABC/",
      undefined,
    );
    expect(parseWebRecipe).not.toHaveBeenCalled();
    expect(result).toEqual(mockRecipe);
  });

  it("calls parseWebRecipe for non-video URLs", async () => {
    vi.mocked(isVideoUrl).mockReturnValue(false);
    vi.mocked(parseWebRecipe).mockResolvedValue(mockRecipe as any);

    const result = await parseRecipeFromUrl("https://example.com/recipe");

    expect(parseWebRecipe).toHaveBeenCalledWith(
      "https://example.com/recipe",
      undefined,
    );
    expect(parseVideoRecipe).not.toHaveBeenCalled();
    expect(result).toEqual(mockRecipe);
  });

  it("passes userComment to the selected parser", async () => {
    vi.mocked(isVideoUrl).mockReturnValue(false);
    vi.mocked(parseWebRecipe).mockResolvedValue(mockRecipe as any);

    await parseRecipeFromUrl("https://example.com/recipe", "make it vegan");

    expect(parseWebRecipe).toHaveBeenCalledWith(
      "https://example.com/recipe",
      "make it vegan",
    );
  });

  it("passes userComment to video parser", async () => {
    vi.mocked(isVideoUrl).mockReturnValue(true);
    vi.mocked(parseVideoRecipe).mockResolvedValue(mockRecipe as any);

    await parseRecipeFromUrl(
      "https://www.instagram.com/reel/ABC/",
      "fewer carbs",
    );

    expect(parseVideoRecipe).toHaveBeenCalledWith(
      "https://www.instagram.com/reel/ABC/",
      "fewer carbs",
    );
  });
});
