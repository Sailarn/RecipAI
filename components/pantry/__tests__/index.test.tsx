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

vi.mock("@/lib/db/pantry", () => ({
  addPantryItem: vi.fn().mockResolvedValue("new-id"),
  removePantryItem: vi.fn().mockResolvedValue(undefined),
  togglePantryItem: vi.fn().mockResolvedValue(undefined),
  setPantryQty: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ingredient-autocomplete", () => ({
  IngredientAutocomplete: vi.fn(),
}));

vi.mock("@/lib/db/ingredients", () => ({
  createProvisionalIngredient: vi.fn().mockResolvedValue("provisional-id"),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { IngredientAutocomplete } from "@/components/ingredient-autocomplete";
import { createProvisionalIngredient } from "@/lib/db/ingredients";
import {
  addPantryItem,
  removePantryItem,
  togglePantryItem,
} from "@/lib/db/pantry";
import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";
import { PantryPage } from "../index";

let capturedOnSelect: ((entry: VocabularyIngredient) => void) | undefined;

const inStock: PantryItem = {
  id: "a1",
  name: "Flour",
  qty: 1,
  unit: "kg",
  cat: "Pantry",
  on: true,
  addedAt: new Date(),
};

const outOfStock: PantryItem = {
  id: "b1",
  name: "Milk",
  qty: 0,
  unit: "l",
  cat: "Dairy",
  on: false,
  addedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useLiveQuery).mockReturnValue([inStock, outOfStock]);
  vi.mocked(IngredientAutocomplete).mockImplementation(
    ({ value, onChange, onSelect }) => {
      capturedOnSelect = onSelect;
      return (
        <input
          data-testid="item-name-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    },
  );
});

describe("PantryPage", () => {
  it("renders in-stock items", () => {
    render(<PantryPage />);
    expect(screen.getByText("Flour")).toBeInTheDocument();
  });

  it("renders out-of-stock items", () => {
    render(<PantryPage />);
    expect(screen.getByText("Milk")).toBeInTheDocument();
  });

  it("shows item count subtitle", () => {
    render(<PantryPage />);
    expect(screen.getByTestId("pantry-subtitle")).toBeInTheDocument();
  });

  it("renders add button", () => {
    render(<PantryPage />);
    expect(screen.getByTestId("add-pantry-item")).toBeInTheDocument();
  });

  it("opens add sheet when add button is clicked", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("add-pantry-item"));
    await waitFor(() => {
      expect(screen.getByTestId("add-item-sheet")).toBeInTheDocument();
    });
  });

  it("renders empty state when pantry is empty", () => {
    vi.mocked(useLiveQuery).mockReturnValue([]);
    render(<PantryPage />);
    expect(screen.getByTestId("pantry-empty")).toBeInTheDocument();
  });
});

describe("PantryRow", () => {
  it("calls togglePantryItem when checkbox is clicked", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("toggle-a1"));
    expect(togglePantryItem).toHaveBeenCalledWith("a1");
  });

  it("calls removePantryItem when delete button is clicked", async () => {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("delete-a1"));
    expect(removePantryItem).toHaveBeenCalledWith("a1");
  });
});

const TOMATO: VocabularyIngredient = {
  id: "tomato-id",
  en: "Tomato",
  ua: null,
  category: "Produce",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

describe("AddItemSheet", () => {
  async function openSheet() {
    render(<PantryPage />);
    fireEvent.click(screen.getByTestId("add-pantry-item"));
    await waitFor(() => screen.getByTestId("add-item-sheet"));
  }

  describe("free-text submit (no vocab match)", () => {
    it("calls createProvisionalIngredient with the trimmed name", async () => {
      await openSheet();

      fireEvent.change(screen.getByTestId("item-name-input"), {
        target: { value: "  Tajín seasoning  " },
      });
      fireEvent.click(screen.getByTestId("add-item-submit"));

      await waitFor(() => {
        expect(createProvisionalIngredient).toHaveBeenCalledWith(
          "Tajín seasoning",
        );
      });
    });

    it("passes the provisional id to addPantryItem", async () => {
      vi.mocked(createProvisionalIngredient).mockResolvedValue(
        "provisional-id",
      );
      await openSheet();

      fireEvent.change(screen.getByTestId("item-name-input"), {
        target: { value: "Tajín seasoning" },
      });
      fireEvent.click(screen.getByTestId("add-item-submit"));

      await waitFor(() => {
        expect(addPantryItem).toHaveBeenCalledWith(
          expect.objectContaining({ ingredientId: "provisional-id" }),
        );
      });
    });
  });

  describe("vocab selection", () => {
    it("passes ingredientId and auto-filled cat to addPantryItem on submit", async () => {
      await openSheet();

      fireEvent.change(screen.getByTestId("item-name-input"), {
        target: { value: "Tomato" },
      });
      act(() => {
        capturedOnSelect?.(TOMATO);
      });
      fireEvent.click(screen.getByTestId("add-item-submit"));

      await waitFor(() => {
        expect(addPantryItem).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Tomato",
            ingredientId: "tomato-id",
            cat: "Produce",
          }),
        );
      });
    });

    it("clears ingredientId when user edits name after selecting a vocab entry", async () => {
      await openSheet();

      act(() => {
        capturedOnSelect?.(TOMATO);
      });
      fireEvent.change(screen.getByTestId("item-name-input"), {
        target: { value: "Tomato edited" },
      });
      fireEvent.click(screen.getByTestId("add-item-submit"));

      await waitFor(() => {
        expect(createProvisionalIngredient).toHaveBeenCalledWith(
          "Tomato edited",
        );
      });
      expect(addPantryItem).toHaveBeenCalledWith(
        expect.objectContaining({ ingredientId: "provisional-id" }),
      );
    });
  });

  describe("error handling", () => {
    it("shows toast and keeps sheet open when createProvisionalIngredient throws", async () => {
      vi.mocked(createProvisionalIngredient).mockRejectedValue(
        new Error("QuotaExceeded"),
      );
      await openSheet();

      fireEvent.change(screen.getByTestId("item-name-input"), {
        target: { value: "Anything" },
      });
      fireEvent.click(screen.getByTestId("add-item-submit"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Couldn't save ingredient");
      });
      expect(screen.getByTestId("add-item-sheet")).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    it("disables the submit button while name is empty", async () => {
      await openSheet();

      expect(screen.getByTestId("add-item-submit")).toBeDisabled();
    });
  });
});
