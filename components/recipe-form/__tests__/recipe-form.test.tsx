/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { RecipeForm } from "../index";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ locale: "en" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/db/recipes", () => ({
  createRecipe: vi.fn().mockResolvedValue("new-recipe-id"),
  updateRecipe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/images", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  isImageKitUrl: vi.fn().mockReturnValue(false),
}));

describe("RecipeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Mode", () => {
    it("renders empty form for creating new recipe", () => {
      render(<RecipeForm />);

      const servingsInput = screen.getByLabelText(/servings/i);
      expect(servingsInput).toHaveValue(1);
      expect(
        screen.getByRole("button", { name: /create/i }),
      ).toBeInTheDocument();
    });

    it("shows validation errors for required fields", async () => {
      render(<RecipeForm />);

      const submitButton = screen.getByRole("button", {
        name: /create/i,
      });
      fireEvent.submit(submitButton.closest("form")!);

      await waitFor(() => {
        expect(screen.getByText(/titleRequired/i)).toBeInTheDocument();
      });
    });

    it("can add and remove ingredients", async () => {
      render(<RecipeForm />);

      // Initially has 1 ingredient field
      const ingredientInputs =
        screen.getAllByPlaceholderText(/ingredientName/i);
      expect(ingredientInputs).toHaveLength(1);

      // Add ingredient
      const addButton = screen.getByRole("button", { name: /addIngredient/i });
      fireEvent.click(addButton);

      // Now has 2 ingredient fields
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/ingredientName/i)).toHaveLength(
          2,
        );
      });

      // Remove ingredient
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      // Back to 1 ingredient field
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/ingredientName/i)).toHaveLength(
          1,
        );
      });
    });

    it("can add and remove instruction steps", async () => {
      render(<RecipeForm />);

      // Initially has 1 instruction field
      const instructionInputs = screen.getAllByPlaceholderText(
        /instructionPlaceholder/i,
      );
      expect(instructionInputs).toHaveLength(1);

      // Add step
      const addButton = screen.getByRole("button", { name: /addStep/i });
      fireEvent.click(addButton);

      // Now has 2 instruction fields
      await waitFor(() => {
        expect(
          screen.getAllByPlaceholderText(/instructionPlaceholder/i),
        ).toHaveLength(2);
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

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue("Test Recipe");

      const servingsInput = screen.getByLabelText(/servings/i);
      expect(servingsInput).toHaveValue(4);
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
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

      const instructionInputs = screen.getAllByPlaceholderText(
        /instructionPlaceholder/i,
      );
      expect(instructionInputs).toHaveLength(2);
      expect(instructionInputs[0]).toHaveValue("Mix ingredients");
      expect(instructionInputs[1]).toHaveValue("Bake at 350F");
    });
  });

  describe("Form Submission", () => {
    it("calls createRecipe when create form is submitted with valid data", async () => {
      render(<RecipeForm />);

      fireEvent.change(screen.getByLabelText(/^title/i), {
        target: { value: "My New Recipe" },
      });
      fireEvent.change(screen.getByPlaceholderText(/ingredientName/i), {
        target: { value: "flour" },
      });

      fireEvent.submit(
        screen.getByRole("button", { name: /create/i }).closest("form")!,
      );

      await waitFor(() => {
        expect(createRecipe).toHaveBeenCalledOnce();
      });

      const callArg = (createRecipe as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArg.title).toBe("My New Recipe");
      expect(callArg.ingredients[0].item).toBe("flour");
    });

    it("calls updateRecipe when edit form is submitted", async () => {
      const mockRecipe: Recipe = {
        id: "existing-id",
        title: "Old Title",
        servings: 2,
        ingredients: [{ id: "i1", item: "eggs", amount: 2, unit: "" }],
        instructions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<RecipeForm recipe={mockRecipe} />);

      fireEvent.change(screen.getByLabelText(/^title/i), {
        target: { value: "Updated Title" },
      });

      fireEvent.submit(
        screen.getByRole("button", { name: /save/i }).closest("form")!,
      );

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledOnce();
      });

      const [calledId, calledData] = (updateRecipe as ReturnType<typeof vi.fn>)
        .mock.calls[0];
      expect(calledId).toBe("existing-id");
      expect(calledData.title).toBe("Updated Title");
    });

    it("does not submit when required fields are missing", async () => {
      render(<RecipeForm />);

      fireEvent.submit(
        screen.getByRole("button", { name: /create/i }).closest("form")!,
      );

      await waitFor(() => {
        expect(screen.getByText(/titleRequired/i)).toBeInTheDocument();
      });

      expect(createRecipe).not.toHaveBeenCalled();
    });
  });
});
