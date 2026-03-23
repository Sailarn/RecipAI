/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Recipe } from "@/lib/db/schema";
import { RecipeForm } from "../index";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({
    locale: "en",
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock database functions - use vi.fn() directly in factory
vi.mock("@/lib/db/recipes", () => ({
  createRecipe: vi.fn(),
  updateRecipe: vi.fn(),
}));

describe("RecipeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Mode", () => {
    it("renders empty form for creating new recipe", () => {
      render(<RecipeForm />);

      const servingsInput = screen.getByLabelText(/servings/i);
      expect(servingsInput).toHaveValue(4);
      expect(
        screen.getByRole("button", { name: /createRecipe/i }),
      ).toBeInTheDocument();
    });

    it("shows validation errors for required fields", async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      const submitButton = screen.getByRole("button", {
        name: /createRecipe/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/titleRequired/i)).toBeInTheDocument();
      });
    });

    it("can add and remove ingredients", async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      // Initially has 1 ingredient field
      const ingredientInputs =
        screen.getAllByPlaceholderText(/ingredientName/i);
      expect(ingredientInputs).toHaveLength(1);

      // Add ingredient
      const addButton = screen.getByRole("button", { name: /addIngredient/i });
      await user.click(addButton);

      // Now has 2 ingredient fields
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/ingredientName/i)).toHaveLength(
          2,
        );
      });

      // Remove ingredient
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      await user.click(removeButtons[0]);

      // Back to 1 ingredient field
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/ingredientName/i)).toHaveLength(
          1,
        );
      });
    });

    it("can add and remove instruction steps", async () => {
      const user = userEvent.setup();
      render(<RecipeForm />);

      // Initially has 1 instruction field
      const instructionInputs =
        screen.getAllByPlaceholderText(/instructionStep/i);
      expect(instructionInputs).toHaveLength(1);

      // Add step
      const addButton = screen.getByRole("button", { name: /addStep/i });
      await user.click(addButton);

      // Now has 2 instruction fields
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/instructionStep/i)).toHaveLength(
          2,
        );
      });
    });
  });

  describe("Edit Mode", () => {
    const mockRecipe: Recipe = {
      id: "test-recipe-1",
      title: "Test Recipe",
      description: "Test description",
      imageUrl: "https://example.com/image.jpg",
      prepTime: 10,
      cookTime: 20,
      totalTime: 30,
      servings: 4,
      ingredients: [
        { id: "ing-1", item: "Flour", amount: 2, unit: "cups" },
        { id: "ing-2", item: "Eggs", amount: 3, unit: "" },
      ],
      instructions: [
        { id: "step-1", order: 1, instruction: "Mix ingredients" },
        { id: "step-2", order: 2, instruction: "Bake at 350F" },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("renders form pre-filled with recipe data", () => {
      render(<RecipeForm recipe={mockRecipe} />);

      const servingsInput = screen.getByLabelText(/servings/i);
      expect(servingsInput).toHaveValue(4);
      expect(
        screen.getByRole("button", { name: /updateRecipe/i }),
      ).toBeInTheDocument();
    });

    it("displays existing ingredients", () => {
      render(<RecipeForm recipe={mockRecipe} />);

      const ingredientInputs =
        screen.getAllByPlaceholderText(/ingredientName/i);
      expect(ingredientInputs).toHaveLength(2);
      expect(ingredientInputs[0]).toHaveValue("Flour");
      expect(ingredientInputs[1]).toHaveValue("Eggs");
    });

    it("displays existing instructions", () => {
      render(<RecipeForm recipe={mockRecipe} />);

      const instructionInputs =
        screen.getAllByPlaceholderText(/instructionStep/i);
      expect(instructionInputs).toHaveLength(2);
      expect(instructionInputs[0]).toHaveValue("Mix ingredients");
      expect(instructionInputs[1]).toHaveValue("Bake at 350F");
    });
  });
});
