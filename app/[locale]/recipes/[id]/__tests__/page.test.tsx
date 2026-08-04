/** @vitest-environment happy-dom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-recipes/server", () => ({
  getPublicRecipe: vi.fn(),
}));
vi.mock("@/components/recipe-detail", () => ({
  RecipeDetail: ({ recipeId }: { recipeId: string }) => (
    <div>detail:{recipeId}</div>
  ),
}));

import { getPublicRecipe } from "@/lib/public-recipes/server";
import RecipePage, { generateMetadata } from "../page";

const params = Promise.resolve({ locale: "en", id: "recipe-1" });
const publicRecipe = {
  id: "recipe-1",
  title: "Soup",
  servings: 2,
  ingredients: [],
  instructions: [],
  owner: { name: "Olena" },
};

describe("recipe page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders recipe detail for the requested id", async () => {
    render(await RecipePage({ params }));

    expect(screen.getByText("detail:recipe-1")).toBeInTheDocument();
  });

  it("does not block the page body on a public-recipe lookup", async () => {
    await RecipePage({ params });

    expect(getPublicRecipe).not.toHaveBeenCalled();
  });

  it("generates noindex public metadata", async () => {
    vi.mocked(getPublicRecipe).mockResolvedValue(publicRecipe);
    await expect(generateMetadata({ params })).resolves.toEqual(
      expect.objectContaining({
        title: "Soup",
        robots: { index: false, follow: false },
        openGraph: expect.objectContaining({ title: "Soup" }),
      }),
    );
  });
});
