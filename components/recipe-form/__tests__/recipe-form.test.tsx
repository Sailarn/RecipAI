/**
 * @vitest-environment happy-dom
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { RecipeForm } from "../index";

let activeLocale = "en";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ locale: activeLocale }),
}));

// The ingredient rows localize their display via a vocabulary live query; with
// no vocab the stored text shows verbatim, which is what these tests assert.
vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: () => undefined,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/db/recipes", () => ({
  createRecipe: vi.fn().mockResolvedValue("new-recipe-id"),
  updateRecipe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/upload/images", () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn(),
  isImageKitUrl: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/parse-recipe/normalize-ingredients", () => ({
  normalizeRecipeIngredients: vi
    .fn()
    .mockResolvedValue({ matched: 0, total: 0 }),
}));

// Stub the fullscreen picker: changing its input picks a vocab entry whose
// English name is the typed value, so tests choose an ingredient by name.
vi.mock("@/components/ingredient-picker", () => ({
  IngredientPicker: ({
    onPick,
  }: {
    onPick: (ingredient: {
      id: string;
      en: string;
      ua: null;
      category: string;
      aliasesEn: string[];
      aliasesUa: string[];
      status: string;
    }) => void;
  }) => (
    <input
      data-testid="mock-ingredient-search"
      onChange={(event) =>
        onPick({
          id: event.target.value,
          en: event.target.value,
          ua: null,
          category: "other",
          aliasesEn: [],
          aliasesUa: [],
          status: "confirmed",
        })
      }
    />
  ),
}));

import { normalizeRecipeIngredients } from "@/lib/parse-recipe/normalize-ingredients";

/** Open the picker for a row and choose an ingredient by name. */
function pickIngredient(rowIndex: number, name: string) {
  fireEvent.click(screen.getByTestId(`ingredient-trigger-${rowIndex}`));
  fireEvent.change(screen.getByTestId("mock-ingredient-search"), {
    target: { value: name },
  });
}

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
    activeLocale = "en";
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
      pickIngredient(0, "test");
      const qtyInput = screen.getByLabelText(/qty/i);
      fireEvent.change(qtyInput, { target: { value: "1" } });

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

    it("navigates past AI ingredients whose unchanged original is null", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "AI recipe",
            servings: 2,
            ingredients: [
              {
                item: "salt",
                amount: null,
                unit: null,
                original: null,
              },
            ],
            instructions: [{ instruction: "Season." }],
          }}
        />,
      );

      await clickNext();
      await clickNext();

      expect(getSubmitButton()).toBeTruthy();
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

      // Initially has 1 ingredient row
      expect(screen.getAllByTestId(/^ingredient-trigger-/)).toHaveLength(1);

      // Add ingredient
      fireEvent.click(screen.getByText("addIngredient"));

      // Now has 2 ingredient rows
      await waitFor(() => {
        expect(screen.getAllByTestId(/^ingredient-trigger-/)).toHaveLength(2);
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

      // Back to 1 ingredient row
      await waitFor(() => {
        expect(screen.getAllByTestId(/^ingredient-trigger-/)).toHaveLength(1);
      });
    });

    it("shows an add-state ghost control when an ingredient has no modifiers", async () => {
      render(<RecipeForm />);
      fillRequiredInfo();

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(screen.getByTestId("additive-empty-0")).toHaveTextContent(
        "addState",
      );
      expect(
        screen.queryByTestId("additive-applied-0"),
      ).not.toBeInTheDocument();
    });

    it("toggles a modifier from the additive picker", async () => {
      render(<RecipeForm />);
      fillRequiredInfo();

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const additiveTrigger = screen.getByTestId("additive-empty-0");
      expect(additiveTrigger).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(additiveTrigger);
      expect(additiveTrigger).toHaveAttribute("aria-expanded", "true");

      const pickerId = additiveTrigger.getAttribute("aria-controls");
      expect(pickerId).not.toBeNull();
      const picker = document.getElementById(pickerId ?? "");
      expect(picker?.tagName).toBe("FIELDSET");
      expect(picker).toHaveAccessibleName("ingredientStatePickerTitle");
      fireEvent.click(screen.getByTestId("additive-option-COLD"));

      expect(screen.getByTestId("additive-applied-0")).toHaveTextContent(
        "cold",
      );
      expect(
        screen
          .getByTestId("additive-applied-0")
          .querySelector("svg.lucide-check"),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("additive-option-COLD"));
      expect(screen.getByTestId("additive-empty-0")).toBeInTheDocument();
    });

    it("renders applied modifier labels in the active locale", async () => {
      activeLocale = "ua";
      render(
        <RecipeForm
          initialData={{
            title: "Тест",
            servings: 2,
            ingredients: [{ item: "Сир", modifiers: ["GRATED"] }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(screen.getByTestId("additive-applied-0")).toHaveTextContent(
        "тертий",
      );
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

      expect(screen.getAllByTestId(/^ingredient-trigger-/)).toHaveLength(2);
      expect(screen.getByTestId("ingredient-trigger-0")).toHaveTextContent(
        "Flour",
      );
      expect(screen.getByTestId("ingredient-trigger-1")).toHaveTextContent(
        "Eggs",
      );
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

  describe("Step sections", () => {
    it("keeps a recipe without sections as a flat step list", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Flat recipe",
            servings: 2,
            instructions: [{ instruction: "Whisk" }, { instruction: "Bake" }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(screen.getAllByTestId(/^step-card-/)).toHaveLength(2);
      expect(screen.queryByTestId("section-container")).not.toBeInTheDocument();
    });

    it("creates, renames, and deletes a section without deleting its steps", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Section recipe",
            servings: 2,
            instructions: [{ instruction: "Whisk" }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      fireEvent.click(screen.getByText("splitIntoSections"));
      const sectionName = screen.getByDisplayValue("newSection");
      fireEvent.change(sectionName, { target: { value: "Sauce" } });
      fireEvent.blur(sectionName);
      expect(screen.getByText("Sauce")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("delete-section"));
      expect(screen.queryByText("Sauce")).not.toBeInTheDocument();
      expect(screen.getAllByTestId(/^step-card-/)).toHaveLength(1);
    });

    it("flattens populated section steps and toggles the section body", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Populated section",
            servings: 2,
            instructions: [{ instruction: "Make sauce", sectionId: "sauce" }],
            sections: [{ id: "sauce", name: "Sauce", order: 0 }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(screen.queryByTitle("sectionOrderFixed")).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue("Make sauce")).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("editStep"));
      expect(screen.getByDisplayValue("Make sauce")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "toggleSection" }));
      expect(screen.queryByDisplayValue("Make sauce")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "toggleSection" }));
      fireEvent.click(screen.getByTestId("delete-section"));

      expect(screen.queryByTestId("section-container")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Make sauce")).toBeInTheDocument();
    });

    it("saves the live section membership and grouped step order", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Organized recipe",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1 }],
            instructions: [
              { instruction: "Ungrouped" },
              { instruction: "Sauce step", sectionId: "sauce" },
            ],
            sections: [{ id: "sauce", name: "Sauce", order: 0 }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce());
      const saved = (createRecipe as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.sections).toEqual([
        { id: "sauce", name: "Sauce", order: 0 },
      ]);
      expect(
        saved.instructions.map(
          (step: { instruction: string }) => step.instruction,
        ),
      ).toEqual(["Sauce step", "Ungrouped"]);
      expect(saved.instructions[0].sectionId).toBe("sauce");
      expect(saved.instructions[1].sectionId).toBeUndefined();
    });

    it("keeps step section identities when blank rows are removed at save", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Blank row recipe",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1 }],
            instructions: [
              { instruction: "Make sauce", sectionId: "sauce" },
              { instruction: "", sectionId: "sauce" },
              { instruction: "Serve", sectionId: "finish" },
            ],
            sections: [
              { id: "sauce", name: "Sauce", order: 0 },
              { id: "finish", name: "Finish", order: 1 },
            ],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce());
      const saved = (createRecipe as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.instructions).toEqual([
        expect.objectContaining({
          instruction: "Make sauce",
          order: 1,
          sectionId: "sauce",
        }),
        expect.objectContaining({
          instruction: "Serve",
          order: 2,
          sectionId: "finish",
        }),
      ]);
    });

    it("keeps section edits after switching away from the steps tab", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Persistent section",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1 }],
            instructions: [{ instruction: "Mix", sectionId: "dough" }],
            sections: [{ id: "dough", name: "Dough", order: 0 }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(screen.getByRole("button", { name: "renameSection" }));
      const nameInput = screen.getByDisplayValue("Dough");
      fireEvent.change(nameInput, { target: { value: "Main dough" } });
      fireEvent.blur(nameInput);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /tabInfo/ }));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(screen.getByText("Main dough")).toBeInTheDocument();

      fireEvent.click(getSubmitButton()!);
      await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce());
      const saved = (createRecipe as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.sections).toEqual([
        { id: "dough", name: "Main dough", order: 0 },
      ]);
    });

    it("keeps an ingredient section catalog entry when its step group is deleted", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Shared section",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1, sectionId: "dough" }],
            instructions: [{ instruction: "Mix", sectionId: "dough" }],
            sections: [{ id: "dough", name: "Dough", order: 0 }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(screen.getByTestId("delete-section"));
      expect(screen.queryByTestId("section-container")).not.toBeInTheDocument();

      fireEvent.click(getSubmitButton()!);
      await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce());
      const saved = (createRecipe as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.sections).toEqual([
        { id: "dough", name: "Dough", order: 0 },
      ]);
      expect(saved.ingredients[0].sectionId).toBe("dough");
      expect(saved.instructions[0].sectionId).toBeUndefined();
    });

    it("prunes sections without ingredient or saved-step references", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Pruned sections",
            servings: 2,
            ingredients: [{ item: "Flour", sectionId: "ingredient-only" }],
            instructions: [{ instruction: "Mix", sectionId: "step-section" }],
            sections: [
              { id: "empty", name: "Empty", order: 0 },
              { id: "ingredient-only", name: "Dough", order: 1 },
              { id: "step-section", name: "Method", order: 2 },
            ],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce());
      const saved = (createRecipe as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.sections).toEqual([
        { id: "ingredient-only", name: "Dough", order: 0 },
        { id: "step-section", name: "Method", order: 1 },
      ]);
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
      pickIngredient(0, "flour");
      fireEvent.change(screen.getByLabelText(/qty/i), {
        target: { value: "1" },
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

    it("saves live additive edits as a modifiers array", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Modifier test",
            servings: 2,
            ingredients: [{ item: "Butter", modifiers: ["GRATED"] }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      fireEvent.click(screen.getByTestId("additive-applied-0"));
      fireEvent.click(screen.getByTestId("additive-option-GRATED"));
      fireEvent.click(screen.getByTestId("additive-option-COLD"));

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(createRecipe).toHaveBeenCalledOnce();
      });

      const callArg = (createRecipe as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArg.ingredients[0].modifiers).toEqual(["COLD"]);
    });

    it("keeps modifiers with their ingredient after removing and adding rows", async () => {
      const mockRecipe: Recipe = {
        id: "modifier-rows",
        title: "Modifier rows",
        servings: 2,
        ingredients: [
          {
            id: "first",
            item: "First",
            modifiers: ["GRATED"],
            sectionId: "first-section",
            original: "grated First",
          },
          {
            id: "second",
            item: "Second",
            modifiers: ["COLD"],
            sectionId: "second-section",
            original: "cold Second",
          },
        ],
        sections: [
          { id: "first-section", name: "First", order: 0 },
          { id: "second-section", name: "Second", order: 1 },
        ],
        instructions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<RecipeForm recipe={mockRecipe} />);

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const removeButtons = screen
        .getAllByRole("button")
        .filter((button) => button.querySelector("svg.lucide-x"));
      fireEvent.click(removeButtons[0]);
      fireEvent.click(screen.getByText("addIngredient"));
      pickIngredient(1, "Third");
      fireEvent.change(screen.getAllByLabelText(/qty/i)[1], {
        target: { value: "1" },
      });

      await waitFor(() => {
        expect(screen.getByTestId("ingredient-trigger-1")).toHaveTextContent(
          "Third",
        );
      });

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledOnce();
      });

      const [, calledData] = (updateRecipe as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(calledData.ingredients).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            item: "Second",
            modifiers: ["COLD"],
            sectionId: "second-section",
            original: "cold Second",
          }),
          expect.objectContaining({ item: "Third" }),
        ]),
      );
      expect(calledData.ingredients[1].modifiers).toBeUndefined();
      expect(calledData.ingredients[1].sectionId).toBeUndefined();
      expect(calledData.ingredients[1].original).toBeUndefined();
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

    it("preserves display-only modifiers/sectionId/sections/original through an edit save", async () => {
      const mockRecipe: Recipe = {
        id: "meta-id",
        title: "Meta Recipe",
        servings: 2,
        sections: [{ id: "sec-1", name: "For the base", order: 0 }],
        ingredients: [
          {
            id: "i1",
            item: "Mozzarella",
            amount: 1,
            unit: "",
            modifiers: ["GRATED"],
            sectionId: "sec-1",
            original: "Grated Mozzarella",
          },
        ],
        instructions: [
          {
            id: "s1",
            order: 1,
            instruction: "Mix",
            sectionId: "sec-1",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<RecipeForm recipe={mockRecipe} />);

      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });

      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledOnce();
      });

      const [, calledData] = (updateRecipe as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(calledData.ingredients[0]).toMatchObject({
        item: "Mozzarella",
        modifiers: ["GRATED"],
        sectionId: "sec-1",
        original: "Grated Mozzarella",
      });
      expect(calledData.instructions[0].sectionId).toBe("sec-1");
      expect(calledData.sections).toEqual([
        { id: "sec-1", name: "For the base", order: 0 },
      ]);
    });

    it("preserves parsed modifiers/sectionId/sections through review → save of a new recipe", async () => {
      render(
        <RecipeForm
          initialData={{
            title: "Rhubarb Pie",
            servings: 4,
            sections: [{ id: "sec-1", name: "For the base", order: 0 }],
            ingredients: [
              {
                item: "Mozzarella",
                modifiers: ["GRATED"],
                sectionId: "sec-1",
                original: "Grated Mozzarella",
              },
            ],
            instructions: [{ instruction: "Mix", sectionId: "sec-1" }],
          }}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });

      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(createRecipe).toHaveBeenCalledOnce();
      });

      const callArg = (createRecipe as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(callArg.ingredients[0]).toMatchObject({
        item: "Mozzarella",
        modifiers: ["GRATED"],
        sectionId: "sec-1",
        original: "Grated Mozzarella",
      });
      expect(callArg.instructions[0].sectionId).toBe("sec-1");
      expect(callArg.sections).toEqual([
        { id: "sec-1", name: "For the base", order: 0 },
      ]);
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

  describe("Normalization wiring", () => {
    it("calls normalizeRecipeIngredients after create with the submitted ingredient items", async () => {
      render(<RecipeForm />);

      fireEvent.change(screen.getByLabelText(/^title/i), {
        target: { value: "Normalization Test" },
      });
      fireEvent.change(screen.getByLabelText(/servings/i), {
        target: { value: "2" },
      });

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 50));
      });

      pickIngredient(0, "garlic");
      fireEvent.change(screen.getByLabelText(/qty/i), {
        target: { value: "3" },
      });

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((r) => setTimeout(r, 50));
      });

      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(normalizeRecipeIngredients).toHaveBeenCalledOnce();
      });

      const [id, ingredients] = vi.mocked(normalizeRecipeIngredients).mock
        .calls[0];
      expect(id).toBe("new-recipe-id");
      expect(ingredients.map((i) => i.item)).toContain("garlic");
    });

    it("calls normalizeRecipeIngredients after update with the submitted ingredient items", async () => {
      const mockRecipe: Recipe = {
        id: "update-test-id",
        title: "Old Recipe",
        servings: 2,
        ingredients: [{ id: "i1", item: "flour", amount: 2, unit: "cups" }],
        instructions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(<RecipeForm recipe={mockRecipe} />);

      // Navigate to ingredients tab and change the ingredient
      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 50));
      });

      pickIngredient(0, "bread flour");

      // Navigate to last tab and save
      await act(async () => {
        fireEvent.click(screen.getByText("next"));
        await new Promise((r) => setTimeout(r, 50));
      });

      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(normalizeRecipeIngredients).toHaveBeenCalledOnce();
      });

      const [id, ingredients] = vi.mocked(normalizeRecipeIngredients).mock
        .calls[0];
      expect(id).toBe("update-test-id");
      expect(ingredients.map((i) => i.item)).toContain("bread flour");
    });

    it("does not block navigation when normalizeRecipeIngredients rejects", async () => {
      vi.mocked(normalizeRecipeIngredients).mockRejectedValue(
        new Error("normalize failed"),
      );

      render(<RecipeForm />);

      fireEvent.change(screen.getByLabelText(/^title/i), {
        target: { value: "Error Test" },
      });
      fireEvent.change(screen.getByLabelText(/servings/i), {
        target: { value: "1" },
      });

      await act(async () => {
        fireEvent.click(screen.getByText("tabIngredients"));
        await new Promise((r) => setTimeout(r, 50));
      });

      pickIngredient(0, "salt");
      fireEvent.change(screen.getByLabelText(/qty/i), {
        target: { value: "1" },
      });

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((r) => setTimeout(r, 50));
      });

      fireEvent.click(getSubmitButton()!);

      // createRecipe must have been called (form submitted successfully)
      await waitFor(() => {
        expect(createRecipe).toHaveBeenCalled();
      });
    });
  });
});
