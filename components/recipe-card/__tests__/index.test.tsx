/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.hoisted(() => vi.fn());

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: mockPush, back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/db/recipes", () => ({
  updateRecipe: vi.fn().mockResolvedValue(undefined),
  deleteRecipe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/use-long-press", () => ({
  useLongPress: () => ({
    onPointerDown: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerCancel: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerLeave: vi.fn(),
  }),
}));

vi.mock("@/components/recipe-card-context-menu", () => ({
  RecipeCardContextMenu: ({
    onClose,
    onToggleStatus,
    onDelete,
    onAddToCollection,
  }: {
    onClose: () => void;
    onToggleStatus: () => void;
    onDelete: () => void;
    onAddToCollection: () => void;
  }) => (
    <div data-testid="context-menu">
      <button type="button" onClick={onClose}>
        close-menu
      </button>
      <button type="button" onClick={onToggleStatus}>
        toggle-status
      </button>
      <button type="button" onClick={onDelete}>
        delete-recipe
      </button>
      <button type="button" onClick={onAddToCollection}>
        add-to-collection
      </button>
    </div>
  ),
}));

vi.mock("@/components/add-to-collection-sheet", () => ({
  AddToCollectionSheet: ({
    onClose,
    onSelect,
  }: {
    onClose: () => void;
    onSelect: (id: string) => void;
  }) => (
    <div data-testid="collection-sheet">
      <button type="button" onClick={() => onSelect("col-1")}>
        select-collection
      </button>
      <button type="button" onClick={onClose}>
        close-sheet
      </button>
    </div>
  ),
}));

vi.mock("@/components/recipe-detail", () => ({
  RecipeDetail: () => null,
}));

vi.mock("@/components/recipe-image", () => ({
  RecipeImage: () => <img alt="recipe" />,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ category }: { category: string }) => <span>{category}</span>,
}));

import { deleteRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { RecipeCard } from "../index";

const baseRecipe = {
  id: "r1",
  title: "Pasta Primavera",
  imageUrl: null,
  imageFocusX: 50,
  imageFocusY: 50,
  imageCropX: null,
  imageCropY: null,
  imageCropWidth: null,
  imageCropHeight: null,
  category: null,
  status: null,
  servings: null,
  ingredients: [],
  collectionIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Recipe;

const baseProps = {
  recipe: baseRecipe,
  collections: [],
  via: "list" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: true }),
  });
});

const openContextMenu = () => {
  fireEvent.contextMenu(screen.getByRole("button"));
};

describe("RecipeCard", () => {
  describe("render", () => {
    it("renders the recipe title", () => {
      render(<RecipeCard {...baseProps} />);

      expect(screen.getByText("Pasta Primavera")).toBeInTheDocument();
    });

    it("renders servings when present", () => {
      render(
        <RecipeCard {...baseProps} recipe={{ ...baseRecipe, servings: 4 }} />,
      );

      expect(screen.getByText(/4/)).toBeInTheDocument();
    });

    it("does not render servings when null", () => {
      render(<RecipeCard {...baseProps} />);

      expect(screen.queryByText(/servings/)).not.toBeInTheDocument();
    });

    it("renders category badge when category is set", () => {
      render(
        <RecipeCard
          {...baseProps}
          recipe={{ ...baseRecipe, category: "pasta" }}
        />,
      );

      expect(screen.getByText("pasta")).toBeInTheDocument();
    });

    it("does not render category badge when category is null", () => {
      render(<RecipeCard {...baseProps} />);

      expect(screen.queryByText("pasta")).not.toBeInTheDocument();
    });

    it("renders tried badge when status is tried", () => {
      render(
        <RecipeCard
          {...baseProps}
          recipe={{ ...baseRecipe, status: "tried" }}
        />,
      );

      expect(screen.getByTestId("badge-tried")).toBeInTheDocument();
    });

    it("does not render tried badge when status is null", () => {
      render(<RecipeCard {...baseProps} />);

      expect(screen.queryByTestId("badge-tried")).not.toBeInTheDocument();
    });
  });

  describe("pantry match badges", () => {
    it("renders cancook badge when all ingredients are available", () => {
      render(
        <RecipeCard {...baseProps} pantryMatch={{ missing: 0, total: 5 }} />,
      );

      expect(screen.getByTestId("badge-cancook")).toBeInTheDocument();
    });

    it("does not render cancook badge when ingredients are missing", () => {
      render(
        <RecipeCard {...baseProps} pantryMatch={{ missing: 2, total: 5 }} />,
      );

      expect(screen.queryByTestId("badge-cancook")).not.toBeInTheDocument();
    });

    it("renders nearly badge with fraction when some ingredients are missing", () => {
      render(
        <RecipeCard {...baseProps} pantryMatch={{ missing: 2, total: 5 }} />,
      );

      expect(screen.getByTestId("badge-nearly")).toBeInTheDocument();
      expect(screen.getByText("3/5")).toBeInTheDocument();
    });

    it("does not render any pantry badge when pantryMatch is null", () => {
      render(<RecipeCard {...baseProps} />);

      expect(screen.queryByTestId("badge-cancook")).not.toBeInTheDocument();
      expect(screen.queryByTestId("badge-nearly")).not.toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("pushes recipe detail route on click", () => {
      render(<RecipeCard {...baseProps} />);

      fireEvent.click(screen.getByRole("button"));

      expect(mockPush).toHaveBeenCalledWith(
        routes.recipes.detail("en", "r1"),
        expect.anything(),
      );
    });
  });

  describe("context menu", () => {
    it("shows context menu on right-click for fine pointer", () => {
      render(<RecipeCard {...baseProps} />);

      openContextMenu();

      expect(screen.getByTestId("context-menu")).toBeInTheDocument();
    });

    it("does not show context menu on right-click for coarse pointer", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockReturnValue({ matches: false }),
      });
      render(<RecipeCard {...baseProps} />);

      openContextMenu();

      expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
    });

    it("hides context menu when onClose is called", () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();

      fireEvent.click(screen.getByRole("button", { name: "close-menu" }));

      expect(screen.queryByTestId("context-menu")).not.toBeInTheDocument();
    });

    it("calls updateRecipe with null when toggling tried status off", async () => {
      render(
        <RecipeCard
          {...baseProps}
          recipe={{ ...baseRecipe, status: "tried" }}
        />,
      );
      openContextMenu();

      fireEvent.click(screen.getByRole("button", { name: "toggle-status" }));

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledWith("r1", { status: null });
      });
    });

    it("calls updateRecipe with tried when toggling from null", async () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();

      fireEvent.click(screen.getByRole("button", { name: "toggle-status" }));

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledWith("r1", { status: "tried" });
      });
    });

    it("asks for confirmation before deleting", async () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();

      fireEvent.click(screen.getByRole("button", { name: "delete-recipe" }));

      expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
      expect(deleteRecipe).not.toHaveBeenCalled();
    });

    it("deletes once the confirmation is accepted", async () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();

      fireEvent.click(screen.getByRole("button", { name: "delete-recipe" }));
      fireEvent.click(await screen.findByRole("button", { name: "delete" }));

      await waitFor(() => {
        expect(deleteRecipe).toHaveBeenCalledWith("r1");
      });
    });
  });

  describe("collection sheet", () => {
    it("shows collection sheet when add-to-collection is triggered", () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();

      fireEvent.click(
        screen.getByRole("button", { name: "add-to-collection" }),
      );

      expect(screen.getByTestId("collection-sheet")).toBeInTheDocument();
    });

    it("closes collection sheet on close", () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();
      fireEvent.click(
        screen.getByRole("button", { name: "add-to-collection" }),
      );

      fireEvent.click(screen.getByRole("button", { name: "close-sheet" }));

      expect(screen.queryByTestId("collection-sheet")).not.toBeInTheDocument();
    });

    it("calls updateRecipe with new collection id when selecting", async () => {
      render(<RecipeCard {...baseProps} />);
      openContextMenu();
      fireEvent.click(
        screen.getByRole("button", { name: "add-to-collection" }),
      );

      fireEvent.click(
        screen.getByRole("button", { name: "select-collection" }),
      );

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledWith("r1", {
          collectionIds: ["col-1"],
        });
      });
    });

    it("removes collection id when already present (toggle off)", async () => {
      render(
        <RecipeCard
          {...baseProps}
          recipe={{ ...baseRecipe, collectionIds: ["col-1"] }}
        />,
      );
      openContextMenu();
      fireEvent.click(
        screen.getByRole("button", { name: "add-to-collection" }),
      );

      fireEvent.click(
        screen.getByRole("button", { name: "select-collection" }),
      );

      await waitFor(() => {
        expect(updateRecipe).toHaveBeenCalledWith("r1", { collectionIds: [] });
      });
    });
  });
});
