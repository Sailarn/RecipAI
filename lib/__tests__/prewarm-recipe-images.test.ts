import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import { selectPrewarmUrls } from "../prewarm-recipe-images";

const IMAGEKIT_ENDPOINT = "https://ik.imagekit.io/demo";

const mockRecipe = (id: string, imageUrl?: string): Recipe =>
  ({
    id,
    title: id,
    imageUrl,
    servings: 1,
    ingredients: [],
    instructions: [],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  }) as Recipe;

describe("selectPrewarmUrls", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", IMAGEKIT_ENDPOINT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the hero-size ImageKit url for each recipe with an ImageKit image", () => {
    const urls = selectPrewarmUrls([
      mockRecipe("a", `${IMAGEKIT_ENDPOINT}/a.jpg`),
    ]);

    expect(urls).toEqual([`${IMAGEKIT_ENDPOINT}/a.jpg?tr=w-800,f-webp,q-80`]);
  });

  it("skips recipes with non-ImageKit or missing images", () => {
    const urls = selectPrewarmUrls([
      mockRecipe("a", "https://other.example.com/x.jpg"),
      mockRecipe("b", undefined),
      mockRecipe("c", ""),
    ]);

    expect(urls).toEqual([]);
  });

  it("dedupes recipes that share the same image url", () => {
    const shared = `${IMAGEKIT_ENDPOINT}/shared.jpg`;
    const urls = selectPrewarmUrls([
      mockRecipe("a", shared),
      mockRecipe("b", shared),
    ]);

    expect(urls).toHaveLength(1);
  });
});
