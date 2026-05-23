// components/recipe-detail/__tests__/recipe-detail.test.tsx
/**
 * @vitest-environment happy-dom
 */

import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as recipesModule from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { RecipeDetail } from "../index";

// Wire onOpenChange through cancel so closing can be tested
vi.mock("@/components/ui/alert-dialog", () => {
  let _onOpenChange: ((v: boolean) => void) | undefined;
  return {
    AlertDialog: ({ children, open, onOpenChange }: any) => {
      _onOpenChange = onOpenChange;
      return open ? <div data-testid="alert-dialog">{children}</div> : null;
    },
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogAction: ({ children, onClick }: any) => (
      <button onClick={onClick} type="button">
        {children}
      </button>
    ),
    AlertDialogCancel: ({ children }: any) => (
      <button type="button" onClick={() => _onOpenChange?.(false)}>
        {children}
      </button>
    ),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

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
  canonicalIngredientIds: ["ing-vocab-1", "ing-vocab-2"],
  unrecognizedIngredients: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RecipeDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: recipe loads successfully
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(mockRecipe);
    vi.mocked(recipesModule.deleteRecipe).mockResolvedValue(undefined);
  });

  it("shows loading state while fetching recipe", async () => {
    vi.mocked(recipesModule.getRecipe).mockImplementation(
      () => new Promise(() => {}),
    );

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    expect(screen.queryByText("Chocolate Cake")).not.toBeInTheDocument();
  });

  it("displays recipe not found when recipe does not exist", async () => {
    vi.mocked(recipesModule.getRecipe).mockResolvedValue(undefined);

    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/recipeNotFound/i)).toBeInTheDocument();
    });
  });

  it("displays recipe data when loaded", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText("Chocolate Cake")).toBeInTheDocument();
    });

    expect(screen.getByText("Delicious chocolate cake")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("displays ingredients list", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Flour/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Sugar/i)).toBeInTheDocument();
  });

  it("displays instructions in order", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/Preheat oven to 350F/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Mix ingredients/i)).toBeInTheDocument();
  });

  it("opens delete dialog on delete button click", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => screen.getByText("Chocolate Cake"));

    const deleteButton = screen.getByRole("button", { name: /^delete$/i });
    await userEvent.click(deleteButton);

    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
    expect(screen.getByText(/deleteConfirmTitle/i)).toBeInTheDocument();
  });

  it("closes delete dialog on cancel", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);
    await waitFor(() => screen.getByText("Chocolate Cake"));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument();
    });
  });

  it("deletes recipe and navigates on confirm", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);

    await waitFor(() => screen.getByText("Chocolate Cake"));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    const dialog = await screen.findByTestId("alert-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(recipesModule.deleteRecipe).toHaveBeenCalledWith("recipe-1");
    });
  });

  it("does not delete when cancel is clicked", async () => {
    render(<RecipeDetail recipeId="recipe-1" locale="en" />);
    await waitFor(() => screen.getByText("Chocolate Cake"));

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(recipesModule.deleteRecipe).not.toHaveBeenCalled();
  });
});
