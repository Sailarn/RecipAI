/**
 * @vitest-environment happy-dom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/db/recipes", () => ({
  getRecipe: vi.fn(),
}));

vi.mock("@/components/recipe-form", () => ({
  RecipeForm: ({ recipe }: { recipe: { id: string } }) => (
    <div data-testid="recipe-form" data-recipe-id={recipe.id} />
  ),
}));

import { getRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { RecipeEditView } from "../index";

const mockRecipe = {
  id: "r1",
  title: "Pasta",
  ingredients: [],
  instructions: [],
  servings: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Recipe;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RecipeEditView", () => {
  describe("loading state", () => {
    it("shows loading text while fetching", () => {
      vi.mocked(getRecipe).mockImplementation(() => new Promise(() => {}));

      render(<RecipeEditView recipeId="r1" />);

      expect(screen.getByText("loading")).toBeInTheDocument();
    });
  });

  describe("not found state", () => {
    it("shows not found text when recipe does not exist", async () => {
      vi.mocked(getRecipe).mockResolvedValue(undefined);

      render(<RecipeEditView recipeId="r1" />);

      await waitFor(() => {
        expect(screen.getByText("recipeNotFound")).toBeInTheDocument();
      });
    });
  });

  describe("loaded state", () => {
    it("renders RecipeForm with the loaded recipe", async () => {
      vi.mocked(getRecipe).mockResolvedValue(mockRecipe);

      render(<RecipeEditView recipeId="r1" />);

      await waitFor(() => {
        expect(screen.getByTestId("recipe-form")).toBeInTheDocument();
      });
      expect(screen.getByTestId("recipe-form")).toHaveAttribute(
        "data-recipe-id",
        "r1",
      );
    });

    it("fetches the recipe using the provided recipeId", async () => {
      vi.mocked(getRecipe).mockResolvedValue(mockRecipe);

      render(<RecipeEditView recipeId="r1" />);

      await waitFor(() => {
        expect(getRecipe).toHaveBeenCalledWith("r1");
      });
    });
  });
});
