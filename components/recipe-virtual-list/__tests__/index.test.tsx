import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Collection, Recipe } from "@/lib/db/schema";
import { RecipeVirtualList } from "../index";

const virtualizerState = vi.hoisted(() => ({ hasMeasuredRows: true }));

vi.mock("next-intl", () => ({
  useTranslations: vi.fn().mockReturnValue((key: string) => key),
}));

vi.mock("@/components/recipe-card", () => ({
  RecipeCard: ({ recipe }: { recipe: Recipe }) => <div>{recipe.title}</div>,
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => {
    const rowHeight = estimateSize();
    return {
      getTotalSize: () => count * rowHeight,
      getVirtualItems: () =>
        virtualizerState.hasMeasuredRows
          ? Array.from({ length: count }, (_, index) => ({
              key: index,
              index,
              start: index * rowHeight,
              end: (index + 1) * rowHeight,
              size: rowHeight,
              lane: 0,
            }))
          : [],
      measureElement: () => {},
    };
  },
}));

const mockGetMissing = vi.fn().mockReturnValue(null);

const mockRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: "r1",
  title: "Borsch",
  servings: 4,
  ingredients: [],
  instructions: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

const mockCollection: Collection = {
  id: "c1",
  name: "Favourites",
  emoji: "⭐",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("RecipeVirtualList", () => {
  beforeEach(() => {
    virtualizerState.hasMeasuredRows = true;
  });

  describe("no results state", () => {
    it("shows noResults text when filtered is empty and search is active", () => {
      const scrollRef = createRef<HTMLDivElement>();

      render(
        <RecipeVirtualList
          filtered={[]}
          collections={[mockCollection]}
          getMissing={mockGetMissing}
          scrollRef={scrollRef}
          hasActiveSearch={true}
        />,
      );

      expect(screen.getByText("noResults")).toBeInTheDocument();
    });

    it("does not show noResults text when filtered is empty and no search is active", () => {
      const scrollRef = createRef<HTMLDivElement>();

      render(
        <RecipeVirtualList
          filtered={[]}
          collections={[mockCollection]}
          getMissing={mockGetMissing}
          scrollRef={scrollRef}
          hasActiveSearch={false}
        />,
      );

      expect(screen.queryByText("noResults")).not.toBeInTheDocument();
    });
  });

  describe("recipe cards", () => {
    it("shows recipe skeletons until the virtualizer measures visible rows", () => {
      virtualizerState.hasMeasuredRows = false;
      const scrollRef = createRef<HTMLDivElement>();

      render(
        <RecipeVirtualList
          filtered={[mockRecipe()]}
          collections={[]}
          getMissing={mockGetMissing}
          scrollRef={scrollRef}
          hasActiveSearch={false}
        />,
      );

      expect(screen.getByTestId("recipe-grid-skeleton")).toBeInTheDocument();
      expect(screen.queryByText("Borsch")).not.toBeInTheDocument();
    });

    it("renders a card for each recipe", () => {
      const scrollRef = createRef<HTMLDivElement>();
      const recipes = [
        mockRecipe({ id: "r1", title: "Borsch" }),
        mockRecipe({ id: "r2", title: "Apple Pie" }),
        mockRecipe({ id: "r3", title: "Pasta" }),
      ];

      render(
        <RecipeVirtualList
          filtered={recipes}
          collections={[mockCollection]}
          getMissing={mockGetMissing}
          scrollRef={scrollRef}
          hasActiveSearch={false}
        />,
      );

      expect(screen.getByText("Borsch")).toBeInTheDocument();
      expect(screen.getByText("Apple Pie")).toBeInTheDocument();
      expect(screen.getByText("Pasta")).toBeInTheDocument();
    });

    it("passes pantryMatch from getMissing to each card", () => {
      const scrollRef = createRef<HTMLDivElement>();
      const recipe = mockRecipe({ id: "r1", title: "Borsch" });
      const pantryResult = { missing: 2, total: 5 };
      const getMissing = vi.fn().mockReturnValue(pantryResult);

      render(
        <RecipeVirtualList
          filtered={[recipe]}
          collections={[]}
          getMissing={getMissing}
          scrollRef={scrollRef}
          hasActiveSearch={false}
        />,
      );

      expect(getMissing).toHaveBeenCalledWith(recipe);
    });
  });
});
