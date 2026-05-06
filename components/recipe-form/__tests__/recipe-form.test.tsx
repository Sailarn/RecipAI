/**
 * @vitest-environment happy-dom
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

/** Fill required fields on the info tab so tab navigation is not blocked */
function fillRequiredInfo(title?: string) {
  fireEvent.change(screen.getByLabelText(/^title/i), {
    target: { value: title ?? "Test Recipe" },
  });
  const servingsInput = screen.getByLabelText(/servings/i);
  fireEvent.change(servingsInput, { target: { value: "4" } });
}

/** Click "next" button and wait for async validation + tab switch */
async function clickNext() {
  // Click the "next" button
  await act(async () => {
    fireEvent.click(screen.getByText("next"));
    await new Promise((r) => setTimeout(r, 100));
  });
  // Wait for the tab content to actually change (the "next" button should still exist
  // if we haven't reached the last tab, or the submit button should appear)
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
}

/** Navigate to the last tab (steps) by clicking Next twice */
async function navigateToLastTab(title?: string) {
  fillRequiredInfo(title);
  await clickNext();
  await clickNext();
}

/** Find the primary action button (Create/Save) in the bottom bar, not the header back button */
function getSubmitButton() {
  // The bottom bar buttons are inside a div with position: absolute; bottom: 0
  const allButtons = screen.getAllByRole("button");
  // The submit button is the one with text "Create" or "Save" (not "createTitle" or "editTitle")
  return allButtons.find(
    (btn) => btn.textContent === "Create" || btn.textContent === "Save",
  );
}

describe("RecipeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Mode", () => {
    it("renders empty form for creating new recipe", async () => {
      render(<RecipeForm />);

      // Info tab is shown by default with servings input
      const servingsInput = screen.getByLabelText(/servings/i);
      expect(servingsInput).toHaveValue(1);

      // Fill required fields on info tab
      fillRequiredInfo();

      // Navigate to ingredients tab via tab header click (skips validation)
      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 100));
      });

      // Fill in the default ingredient so we can navigate past this tab
      const ingredientInput = screen.getByPlaceholderText(/ingredientName/i);
      fireEvent.change(ingredientInput, { target: { value: "test" } });

      // Navigate to steps tab via "next" (triggers ingredients validation)
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 100));
      });

      // Should now be on steps tab
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/instructionPlaceholder/i),
        ).toBeInTheDocument();
      });

      // Now the submit button should be "Create"
      expect(getSubmitButton()).toBeTruthy();
      expect(getSubmitButton()?.textContent).toBe("Create");
    });

    it("shows validation errors when trying to navigate with empty required fields", async () => {
      render(<RecipeForm />);

      // Try clicking "Next" without filling required fields
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // The info tab should show validation errors inline
      expect(screen.getByText("titleRequired")).toBeInTheDocument();
    });

    it("can add and remove ingredients", async () => {
      render(<RecipeForm />);

      // Fill required fields first, then navigate to ingredients tab
      fillRequiredInfo();
      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Initially has 1 ingredient field
      const ingredientInputs =
        screen.getAllByPlaceholderText(/ingredientName/i);
      expect(ingredientInputs).toHaveLength(1);

      // Add ingredient
      fireEvent.click(screen.getByText("addIngredient"));

      // Now has 2 ingredient fields
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/ingredientName/i)).toHaveLength(
          2,
        );
      });

      // Remove ingredient — find the remove button (X icon inside a button, not a tab/next/add/back button)
      const allButtons = screen.getAllByRole("button");
      const removeBtn = allButtons.find((btn) => {
        const text = btn.textContent || "";
        return (
          btn.querySelector("svg") &&
          !text.includes("tab") &&
          text !== "next" &&
          text !== "addIngredient" &&
          text !== "back" &&
          text !== "Create" &&
          text !== "createTitle"
        );
      });
      if (removeBtn) {
        fireEvent.click(removeBtn);
      }

      // Back to 1 ingredient field
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText(/ingredientName/i)).toHaveLength(
          1,
        );
      });
    });

    it("can add and remove instruction steps", async () => {
      render(<RecipeForm />);

      // Fill required fields first, then navigate to steps tab
      fillRequiredInfo();
      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Initially has 1 instruction field
      const instructionInputs = screen.getAllByPlaceholderText(
        /instructionPlaceholder/i,
      );
      expect(instructionInputs).toHaveLength(1);

      // Add step
      fireEvent.click(screen.getByText("addStep"));

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

    it("renders form pre-filled with recipe data", async () => {
      render(<RecipeForm recipe={mockRecipe} />);

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveValue("Test Recipe");

      const servingsInput = screen.getByLabelText(/servings/i);
      expect(servingsInput).toHaveValue(4);

      // Navigate to last tab to find the Save button
      await navigateToLastTab();
      expect(getSubmitButton()).toBeTruthy();
      expect(getSubmitButton()?.textContent).toBe("Save");
    });

    it("displays existing ingredients", async () => {
      render(<RecipeForm recipe={mockRecipe} />);

      // Navigate to ingredients tab (edit mode has pre-filled data, so validation passes)
      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 50));
      });

      const ingredientInputs =
        screen.getAllByPlaceholderText(/ingredientName/i);
      expect(ingredientInputs).toHaveLength(2);
      expect(ingredientInputs[0]).toHaveValue("Flour");
      expect(ingredientInputs[1]).toHaveValue("Eggs");
    });

    it("displays existing instructions", async () => {
      render(<RecipeForm recipe={mockRecipe} />);

      // Navigate to steps tab (edit mode has pre-filled data, so validation passes)
      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((r) => setTimeout(r, 50));
      });

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

      // Fill in required fields on info tab
      fireEvent.change(screen.getByLabelText(/^title/i), {
        target: { value: "My New Recipe" },
      });
      fireEvent.change(screen.getByLabelText(/servings/i), {
        target: { value: "2" },
      });

      // Navigate to ingredients tab
      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Fill in ingredient
      fireEvent.change(screen.getByPlaceholderText(/ingredientName/i), {
        target: { value: "flour" },
      });

      // Navigate to steps tab
      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Click the Create button (bottom bar, not header)
      const submitBtn = getSubmitButton();
      expect(submitBtn).toBeTruthy();
      fireEvent.click(submitBtn!);

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

      // Update title on info tab
      fireEvent.change(screen.getByLabelText(/^title/i), {
        target: { value: "Updated Title" },
      });

      // Navigate to last tab (don't use fillRequiredInfo which would overwrite title)
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Click the Save button
      const submitBtn = getSubmitButton();
      expect(submitBtn).toBeTruthy();
      fireEvent.click(submitBtn!);

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

      // Try clicking next without filling required fields
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Should show validation error on info tab
      expect(screen.getByText("titleRequired")).toBeInTheDocument();

      expect(createRecipe).not.toHaveBeenCalled();
    });
  });
});
