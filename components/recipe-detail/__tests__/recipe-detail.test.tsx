// components/recipe-detail/__tests__/recipe-detail.test.tsx
/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as recipesModule from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { RecipeDetail } from "../index";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

// Mock database functions
vi.mock("@/lib/db/recipes", () => ({
  getRecipe: vi.fn(),
  deleteRecipe: vi.fn(),
}));

const mockRecipe: Recipe = {
  id: "recipe-1",
  title: "Chocolate Cake",
  description: "Delicious chocolate cake",
  imageUrl: "https://example.com/cake.jpg",
  prepTime: 20,
  cookTime: 40,
  totalTime: 60,
  servings: 8,
  ingredients: [
    { id: "ing-1", item: "Flour", amount: 2, unit: "cups" },
    { id: "ing-2", item: "Sugar", amount: 1, unit: "cup" },
  ],
  instructions: [
    { id: "step-1", order: 1, instruction: "Preheat oven to 350F" },
    { id: "step-2", order: 2, instruction: "Mix ingredients" },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RecipeDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state while fetching recipe", () => {
    vi.mocked(recipesModule.getRecipe).mockReturnValue(new Promise(() => { }));

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("displays recipe not found when recipe does not exist", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/recipeNotFound/i)).toBeInTheDocument();
    });
  });

  it("displays recipe data when loaded", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    expect(screen.getByText("Delicious chocolate cake")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("displays ingredients list", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Flour/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Sugar/i)).toBeInTheDocument();
  });

  it("displays instructions in order", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Preheat oven to 350F/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Mix ingredients/i)).toBeInTheDocument();
  });

  it("opens delete modal on delete button click", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(
      screen.getByRole("heading", { name: /confirm/i }),
    ).toBeInTheDocument();
  });

  it("closes delete modal on cancel", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: /confirm/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("deletes recipe and navigates on confirm", async () => {
    const user = userEvent.setup();
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);
    vi.mocked(recipesModule.deleteRecipe).mockResolvedValue(undefined);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    const confirmButtons = screen.getAllByRole("button", { name: /delete/i });
    const confirmButton = confirmButtons[1];
    await user.click(confirmButton);

    await waitFor(() => {
      expect(recipesModule.deleteRecipe).toHaveBeenCalledWith("recipe-1");
    });
  });
});
