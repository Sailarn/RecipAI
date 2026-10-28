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
import { updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { uploadImage } from "@/lib/upload/images";
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

type DraftRecipe = Omit<Partial<Recipe>, "ingredients" | "instructions"> & {
  ingredients?: Omit<Recipe["ingredients"][number], "id">[];
  instructions?: Omit<Recipe["instructions"][number], "id" | "order">[];
};

/** A saved recipe built from just the fields a test cares about. */
function recipeWith({
  ingredients = [],
  instructions = [],
  ...fields
}: DraftRecipe): Recipe {
  return {
    id: "recipe-1",
    title: "Test Recipe",
    servings: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields,
    ingredients: ingredients.map((ingredient, index) => ({
      id: `ing-${index}`,
      ...ingredient,
    })),
    instructions: instructions.map((instruction, index) => ({
      id: `step-${index}`,
      order: index + 1,
      ...instruction,
    })),
  };
}

/** The recipe whose single ingredient and step the editing tests change. */
const simpleRecipe = recipeWith({
  ingredients: [{ item: "flour", amount: 1 }],
  instructions: [{ instruction: "Mix" }],
});

/** The arguments of the one recipe update the form made. */
function savedRecipe() {
  return vi.mocked(updateRecipe).mock.calls[0][1] as Recipe;
}

/** Clear the title on the info tab and try to move on. */
async function submitWithoutTitle() {
  fireEvent.change(screen.getByLabelText(/^title/i), {
    target: { value: "" },
  });
  await act(async () => {
    fireEvent.click(screen.getByText("next"));
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

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

/** The Save button in the bottom bar, not the header's back button. */
function getSubmitButton() {
  return screen
    .getAllByRole("button")
    .find((button) => button.textContent === "save");
}

describe("RecipeForm", () => {
  beforeEach(() => {
    activeLocale = "en";
  });

  describe("Editing rows", () => {
    it("navigates past AI ingredients whose unchanged original is null", async () => {
      render(
        <RecipeForm
          recipe={recipeWith({
            title: "AI recipe",
            servings: 2,
            ingredients: [
              // Rows synced from Postgres carry null for unset columns.
              { item: "salt", original: null } as never,
            ],
            instructions: [{ instruction: "Season." }],
          })}
        />,
      );

      await clickNext();
      await clickNext();

      expect(getSubmitButton()).toBeTruthy();
    });

    it("shows validation errors when trying to navigate with empty required fields", async () => {
      render(<RecipeForm recipe={simpleRecipe} />);

      await submitWithoutTitle();

      expect(screen.getByText("titleRequired")).toBeInTheDocument();
    });

    it("can add and remove ingredients", async () => {
      render(<RecipeForm recipe={simpleRecipe} />);

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

      const removeButtons = screen
        .getAllByRole("button")
        .filter((button) => button.querySelector("svg.lucide-x"));
      fireEvent.click(removeButtons[0]);

      // Back to 1 ingredient row
      await waitFor(() => {
        expect(screen.getAllByTestId(/^ingredient-trigger-/)).toHaveLength(1);
      });
    });

    it("shows an add-state ghost control when an ingredient has no modifiers", async () => {
      render(<RecipeForm recipe={simpleRecipe} />);

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
      render(<RecipeForm recipe={simpleRecipe} />);

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
      activeLocale = "uk";
      render(
        <RecipeForm
          recipe={recipeWith({
            title: "Тест",
            servings: 2,
            ingredients: [{ item: "Сир", modifiers: ["GRATED"] }],
          })}
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
      render(<RecipeForm recipe={simpleRecipe} />);

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
      expect(getSubmitButton()?.textContent).toBe("save");
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
          recipe={recipeWith({
            title: "Flat recipe",
            servings: 2,
            instructions: [{ instruction: "Whisk" }, { instruction: "Bake" }],
          })}
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
          recipe={recipeWith({
            title: "Section recipe",
            servings: 2,
            instructions: [{ instruction: "Whisk" }],
          })}
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
          recipe={recipeWith({
            title: "Populated section",
            servings: 2,
            instructions: [{ instruction: "Make sauce", sectionId: "sauce" }],
            sections: [{ id: "sauce", name: "Sauce", order: 0 }],
          })}
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
          recipe={recipeWith({
            title: "Organized recipe",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1 }],
            instructions: [
              { instruction: "Ungrouped" },
              { instruction: "Sauce step", sectionId: "sauce" },
            ],
            sections: [{ id: "sauce", name: "Sauce", order: 0 }],
          })}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce());
      const saved = savedRecipe();
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
          recipe={recipeWith({
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
          })}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce());
      const saved = savedRecipe();
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
          recipe={recipeWith({
            title: "Persistent section",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1 }],
            instructions: [{ instruction: "Mix", sectionId: "dough" }],
            sections: [{ id: "dough", name: "Dough", order: 0 }],
          })}
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
      await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce());
      const saved = savedRecipe();
      expect(saved.sections).toEqual([
        { id: "dough", name: "Main dough", order: 0 },
      ]);
    });

    it("keeps an ingredient section catalog entry when its step group is deleted", async () => {
      render(
        <RecipeForm
          recipe={recipeWith({
            title: "Shared section",
            servings: 2,
            ingredients: [{ item: "Flour", amount: 1, sectionId: "dough" }],
            instructions: [{ instruction: "Mix", sectionId: "dough" }],
            sections: [{ id: "dough", name: "Dough", order: 0 }],
          })}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(screen.getByTestId("delete-section"));
      expect(screen.queryByTestId("section-container")).not.toBeInTheDocument();

      fireEvent.click(getSubmitButton()!);
      await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce());
      const saved = savedRecipe();
      expect(saved.sections).toEqual([
        { id: "dough", name: "Dough", order: 0 },
      ]);
      expect(saved.ingredients[0].sectionId).toBe("dough");
      expect(saved.instructions[0].sectionId).toBeUndefined();
    });

    it("prunes sections without ingredient or saved-step references", async () => {
      render(
        <RecipeForm
          recipe={recipeWith({
            title: "Pruned sections",
            servings: 2,
            ingredients: [{ item: "Flour", sectionId: "ingredient-only" }],
            instructions: [{ instruction: "Mix", sectionId: "step-section" }],
            sections: [
              { id: "empty", name: "Empty", order: 0 },
              { id: "ingredient-only", name: "Dough", order: 1 },
              { id: "step-section", name: "Method", order: 2 },
            ],
          })}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      fireEvent.click(getSubmitButton()!);

      await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce());
      const saved = savedRecipe();
      expect(saved.sections).toEqual([
        { id: "ingredient-only", name: "Dough", order: 0 },
        { id: "step-section", name: "Method", order: 1 },
      ]);
    });
  });

  describe("Form Submission", () => {
    it("saves live additive edits as a modifiers array", async () => {
      render(
        <RecipeForm
          recipe={recipeWith({
            title: "Modifier test",
            servings: 2,
            ingredients: [{ item: "Butter", modifiers: ["GRATED"] }],
          })}
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
        expect(updateRecipe).toHaveBeenCalledOnce();
      });

      const callArg = savedRecipe();
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

    it("saves the newly picked photo's uploaded URL in the same write, not a stale one patched in later", async () => {
      const mockRecipe: Recipe = {
        id: "existing-id",
        title: "Old Title",
        imageUrl: "https://example.com/old-photo.jpg",
        servings: 2,
        ingredients: [{ id: "i1", item: "eggs", amount: 2, unit: "" }],
        instructions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const uploadedUrl = "https://ik.imagekit.io/test/new-photo.jpg";
      vi.mocked(uploadImage).mockResolvedValue({
        url: uploadedUrl,
        fileId: "new-file",
      });

      const { container } = render(<RecipeForm recipe={mockRecipe} />);

      const file = new File(["x"], "photo.png", { type: "image/png" });
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeTruthy();
      await act(async () => {
        fireEvent.change(fileInput as HTMLInputElement, {
          target: { files: [file] },
        });
      });

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

      expect(uploadImage).toHaveBeenCalledWith(file);
      const [, calledData] = (updateRecipe as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(calledData.imageUrl).toBe(uploadedUrl);
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

    it("does not submit when required fields are missing", async () => {
      render(<RecipeForm recipe={simpleRecipe} />);

      await submitWithoutTitle();

      expect(screen.getByText("titleRequired")).toBeInTheDocument();

      expect(updateRecipe).not.toHaveBeenCalled();
    });
  });

  describe("Normalization wiring", () => {
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

      render(<RecipeForm recipe={simpleRecipe} />);

      await act(async () => {
        fireEvent.click(screen.getByText("tabSteps"));
        await new Promise((r) => setTimeout(r, 50));
      });

      fireEvent.click(getSubmitButton()!);

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalled();
      });
    });
  });
});
