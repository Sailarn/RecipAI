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

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    pantry: { toArray: vi.fn() },
    ingredients: { bulkGet: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/db/ingredients", () => ({
  resolveOrCreateIngredient: vi.fn().mockResolvedValue("provisional-id"),
}));

vi.mock("@/lib/db/pantry", () => ({
  addPantryItem: vi.fn().mockResolvedValue(undefined),
  togglePantryItem: vi.fn().mockResolvedValue(undefined),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { resolveOrCreateIngredient } from "@/lib/db/ingredients";
import { addPantryItem, togglePantryItem } from "@/lib/db/pantry";
import type { PantryItem, RecipeIngredient } from "@/lib/db/schema";
import { ServingsCalculator } from "../index";

const baseIngredient = (
  overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient =>
  ({
    id: "i1",
    item: "flour",
    amount: 2,
    unit: "cups",
    ...overrides,
  }) as RecipeIngredient;

const basePantryItem = (overrides: Partial<PantryItem> = {}): PantryItem =>
  ({
    id: "p1",
    name: "flour",
    qty: 1,
    unit: "pcs",
    cat: "Other",
    on: true,
    ingredientId: "vocab-flour",
    ...overrides,
  }) as PantryItem;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLiveQuery).mockReturnValue([]);
});

describe("ServingsCalculator", () => {
  describe("ingredient list", () => {
    it("renders ingredient names", () => {
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[
            baseIngredient({ id: "i1", item: "flour" }),
            baseIngredient({ id: "i2", item: "eggs", unit: "" }),
          ]}
        />,
      );

      expect(screen.getByText(/flour/)).toBeInTheDocument();
      expect(screen.getByText(/eggs/)).toBeInTheDocument();
    });

    it("renders amount and unit alongside name", () => {
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[
            baseIngredient({ amount: 2, unit: "cups", item: "flour" }),
          ]}
        />,
      );

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText(/cups/)).toBeInTheDocument();
    });

    it("omits amount when ingredient has no amount", () => {
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[baseIngredient({ amount: undefined, item: "salt" })]}
        />,
      );

      expect(screen.getByText(/salt/)).toBeInTheDocument();
    });
  });

  describe("servings counter", () => {
    it("displays the original servings count", () => {
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[baseIngredient()]}
        />,
      );

      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("increments servings when + is clicked", () => {
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[baseIngredient()]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Increase servings" }),
      );

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("decrements servings when − is clicked", () => {
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[baseIngredient()]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Decrease servings" }),
      );

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("does not decrement below 1", () => {
      render(
        <ServingsCalculator
          originalServings={1}
          ingredients={[baseIngredient()]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Decrease servings" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Decrease servings" }),
      );

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("scales ingredient amounts proportionally", () => {
      // originalServings=4, amount=8 → after +1: servings=5, scaled=10 (unique, no collision)
      render(
        <ServingsCalculator
          originalServings={4}
          ingredients={[baseIngredient({ amount: 8, unit: "g" })]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Increase servings" }),
      );

      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("formats scaled amount as integer when result is whole", () => {
      // originalServings=2, amount=6 → after +1: servings=3, scaled=9 (unique)
      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ amount: 6, unit: "" })]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Increase servings" }),
      );

      expect(screen.getByText("9")).toBeInTheDocument();
    });

    it("formats scaled amount to one decimal when fractional", () => {
      // originalServings=2, amount=1 → after +1: servings=3, ratio=1.5 → scaled=1.5 (unique)
      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ amount: 1, unit: "" })]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Increase servings" }),
      );

      expect(screen.getByText("1.5")).toBeInTheDocument();
    });
  });

  describe("stock dot", () => {
    it("shows in-stock (green) when the ingredient matches a pantry item by name, even without canonical ids", () => {
      vi.mocked(useLiveQuery).mockReturnValue([
        basePantryItem({ name: "flour", on: true, ingredientId: "vocab-x" }),
      ]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "flour" })]}
        />,
      );

      expect(screen.getByText(/flour/).previousElementSibling).toHaveAttribute(
        "data-status",
        "in",
      );
    });

    it("shows in-stock (green) across languages: recipe 'flour' matches pantry 'борошно' by shared canonical id", () => {
      vi.mocked(useLiveQuery).mockReturnValue([
        basePantryItem({
          name: "борошно",
          ingredientId: "canonical-flour",
          on: true,
        }),
      ]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "flour" })]}
          canonicalIngredientIds={["canonical-flour"]}
        />,
      );

      expect(screen.getByText(/flour/).previousElementSibling).toHaveAttribute(
        "data-status",
        "in",
      );
    });

    it("shows out-of-stock (red) when the ingredient is not in the pantry", () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "saffron" })]}
        />,
      );

      expect(
        screen.getByText(/saffron/).previousElementSibling,
      ).toHaveAttribute("data-status", "out");
    });
  });

  describe("pantry — add button", () => {
    it("shows add button when ingredient is not in pantry", () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "flour" })]}
        />,
      );

      expect(
        screen.getByRole("button", { name: /add flour to pantry/i }),
      ).toBeInTheDocument();
    });

    it("calls addPantryItem when add button clicked", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "flour" })]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /add flour to pantry/i }),
      );

      await waitFor(() => {
        expect(addPantryItem).toHaveBeenCalledOnce();
      });

      expect(addPantryItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: "flour", on: true }),
      );
    });

    it("creates a provisional ingredient when no canonical id", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "truffle" })]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /add truffle to pantry/i }),
      );

      await waitFor(() => {
        expect(resolveOrCreateIngredient).toHaveBeenCalledWith("truffle");
      });
    });

    it("does not create provisional ingredient when canonical id is provided", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "flour" })]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /add flour to pantry/i }),
      );

      await waitFor(() => {
        expect(addPantryItem).toHaveBeenCalled();
      });

      expect(resolveOrCreateIngredient).not.toHaveBeenCalled();
    });
  });

  describe("pantry — toggle button", () => {
    it("shows toggle button when ingredient is already in pantry", () => {
      vi.mocked(useLiveQuery).mockReturnValue([
        basePantryItem({ ingredientId: "vocab-flour", on: true }),
      ]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "flour" })]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      expect(
        screen.getByRole("button", { name: /mark as out of stock/i }),
      ).toBeInTheDocument();
    });

    it("shows checkmark when pantry item is on", () => {
      vi.mocked(useLiveQuery).mockReturnValue([
        basePantryItem({ ingredientId: "vocab-flour", on: true }),
      ]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient()]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      expect(
        screen.getByRole("button", { name: /mark as out of stock/i }),
      ).toHaveTextContent("✓");
    });

    it("shows empty toggle button when pantry item is off", () => {
      vi.mocked(useLiveQuery).mockReturnValue([
        basePantryItem({ ingredientId: "vocab-flour", on: false }),
      ]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient()]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      const toggleBtn = screen.getByRole("button", {
        name: /mark as in stock/i,
      });
      expect(toggleBtn).toHaveTextContent("");
    });

    it("calls togglePantryItem with the pantry item id when clicked", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([
        basePantryItem({ id: "p1", ingredientId: "vocab-flour", on: true }),
      ]);

      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient()]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /mark as out of stock/i }),
      );

      await waitFor(() => {
        expect(togglePantryItem).toHaveBeenCalledWith("p1");
      });
    });
  });

  describe("canonical name toggle", () => {
    it("does not show mode toggle when no canonical ids", () => {
      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient()]}
        />,
      );

      expect(
        screen.queryByRole("button", { name: "parsed" }),
      ).not.toBeInTheDocument();
    });

    it("shows mode toggle when canonical ids are provided", () => {
      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient()]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      expect(
        screen.getByRole("button", { name: "parsed" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "original" }),
      ).toBeInTheDocument();
    });

    it("shows original ingredient name when original mode is selected", async () => {
      render(
        <ServingsCalculator
          originalServings={2}
          ingredients={[baseIngredient({ item: "plain flour" })]}
          canonicalIngredientIds={["vocab-flour"]}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "original" }));
      });

      expect(screen.getByText(/plain flour/)).toBeInTheDocument();
    });
  });
});
