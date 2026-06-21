import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("@/lib/db/pantry", () => ({
  addPantryItem: vi.fn().mockResolvedValue("new-id"),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: vi.fn().mockReturnValue({ locale: "en" }),
}));

// The real slide reveals the grid via onAnimationComplete; fire it on mount so
// tests observe the settled panel (grid rendered) rather than the in-flight one.
vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      onAnimationComplete,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      onAnimationComplete?: () => void;
    }) => {
      useEffect(() => {
        onAnimationComplete?.();
      }, [onAnimationComplete]);
      return <div {...props}>{children}</div>;
    },
  },
}));

import { useLiveQuery } from "dexie-react-hooks";
import { addPantryItem } from "@/lib/db/pantry";
import type { PantryItem, VocabularyIngredient } from "@/lib/db/schema";
import { AddPantryPicker } from "../index";

const TOMATO: VocabularyIngredient = {
  id: "tomato-id",
  en: "Tomato",
  ua: "Помідор",
  category: "vegetable",
  aliasesEn: ["tomatoes"],
  aliasesUa: [],
  status: "confirmed",
};

const MILK: VocabularyIngredient = {
  id: "milk-id",
  en: "Milk",
  ua: null,
  category: "dairy",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

const GARLIC: VocabularyIngredient = {
  id: "garlic-id",
  en: "Garlic",
  ua: null,
  category: "vegetable",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

const RICE: VocabularyIngredient = {
  id: "rice-id",
  en: "Rice",
  ua: null,
  category: "grain",
  aliasesEn: [],
  aliasesUa: [],
  status: "confirmed",
};

const onClose = vi.fn();

// The component calls useLiveQuery twice per render (vocab, then pantry).
// Because a useEffect triggers a re-render after mount, mockReturnValueOnce
// gets consumed on the first (null-returning) render and leaves nothing for
// the real render. mockImplementation cycling by call parity is reliable.
function setupMocks(
  vocab: VocabularyIngredient[],
  pantryItems: PantryItem[] = [],
) {
  let callCount = 0;
  vi.mocked(useLiveQuery).mockImplementation(() => {
    const result = callCount % 2 === 0 ? vocab : pantryItems;
    callCount++;
    return result;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AddPantryPicker", () => {
  it("renders as an opaque fullscreen page", () => {
    setupMocks([TOMATO]);
    render(<AddPantryPicker onClose={onClose} />);

    expect(screen.getByTestId("add-pantry-picker")).toHaveClass(
      "bg-[#080808]",
      "z-[1000]",
    );
    expect(screen.getByTestId("pantry-picker-mesh")).toHaveClass(
      "[background:var(--app-mesh)]",
    );
  });

  it("keeps the commit action clear of the device edge", () => {
    setupMocks([TOMATO]);
    render(<AddPantryPicker onClose={onClose} />);

    expect(screen.getByTestId("pantry-picker-commit-bar")).toHaveClass(
      "pb-[max(26px,calc(env(safe-area-inset-bottom)+16px))]",
    );
  });

  it("groups lowercase vocabulary categories", () => {
    setupMocks([GARLIC, MILK, RICE]);
    render(<AddPantryPicker onClose={onClose} />);

    expect(
      screen.getByRole("heading", { name: "Produce" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dairy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pantry" })).toBeInTheDocument();
  });

  it("renders ingredient tiles from confirmed vocab", () => {
    setupMocks([TOMATO, MILK]);
    render(<AddPantryPicker onClose={onClose} />);

    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
  });

  it("tapping a tile selects it and updates the commit button count", () => {
    setupMocks([TOMATO, MILK]);
    render(<AddPantryPicker onClose={onClose} />);

    fireEvent.click(screen.getByText("Tomato").closest("button")!);

    expect(screen.getByTestId("pantry-picker-commit")).toHaveTextContent(
      "Add 1 item to Pantry",
    );
  });

  it("tapping a selected tile deselects it", () => {
    setupMocks([TOMATO, MILK]);
    render(<AddPantryPicker onClose={onClose} />);

    fireEvent.click(screen.getByText("Tomato").closest("button")!);
    fireEvent.click(screen.getByText("Tomato").closest("button")!);

    expect(screen.getByTestId("pantry-picker-commit")).toHaveTextContent(
      "Add items to Pantry",
    );
    expect(screen.getByTestId("pantry-picker-commit")).toBeDisabled();
  });

  it("commit calls addPantryItem once per selected with correct args", async () => {
    setupMocks([TOMATO, MILK]);
    render(<AddPantryPicker onClose={onClose} />);

    fireEvent.click(screen.getByText("Tomato").closest("button")!);
    fireEvent.click(screen.getByText("Milk").closest("button")!);
    fireEvent.click(screen.getByTestId("pantry-picker-commit"));

    await waitFor(() => {
      expect(addPantryItem).toHaveBeenCalledTimes(2);
      expect(addPantryItem).toHaveBeenCalledWith({
        name: "Tomato",
        ingredientId: "tomato-id",
        on: true,
      });
      expect(addPantryItem).toHaveBeenCalledWith({
        name: "Milk",
        ingredientId: "milk-id",
        on: true,
      });
    });
  });

  it("calls onClose after commit", async () => {
    setupMocks([TOMATO]);
    render(<AddPantryPicker onClose={onClose} />);

    fireEvent.click(screen.getByText("Tomato").closest("button")!);
    fireEvent.click(screen.getByTestId("pantry-picker-commit"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("commit button is disabled when nothing is selected", () => {
    setupMocks([TOMATO, MILK]);
    render(<AddPantryPicker onClose={onClose} />);

    expect(screen.getByTestId("pantry-picker-commit")).toBeDisabled();
  });

  describe("already-in-pantry items", () => {
    const tomatoPantryItem: PantryItem = {
      id: "p1",
      ingredientId: "tomato-id",
      name: "Tomato",
      qty: 1,
      unit: "pcs",
      cat: "Other",
      on: true,
      addedAt: new Date(),
    };

    it("renders previously added items as checked without tint or label", () => {
      setupMocks([TOMATO, MILK], [tomatoPantryItem]);
      render(<AddPantryPicker onClose={onClose} />);

      const tomatoTile = screen.getByText("Tomato").closest("button");
      expect(tomatoTile).toHaveAttribute("data-state", "added");
      expect(tomatoTile).toHaveClass("bg-[var(--glass-card-bg)]");
      expect(tomatoTile).not.toHaveClass("bg-[rgba(134,239,172,0.12)]");
      expect(screen.queryByText("Added")).not.toBeInTheDocument();
    });

    it("already-added tiles are disabled", () => {
      setupMocks([TOMATO, MILK], [tomatoPantryItem]);
      render(<AddPantryPicker onClose={onClose} />);

      const tomatoTile = screen.getByText("Tomato").closest("button")!;
      expect(tomatoTile).toBeDisabled();
    });

    it("clicking an already-added tile does not select it", () => {
      setupMocks([TOMATO, MILK], [tomatoPantryItem]);
      render(<AddPantryPicker onClose={onClose} />);

      fireEvent.click(screen.getByText("Tomato").closest("button")!);

      expect(screen.getByTestId("pantry-picker-commit")).toBeDisabled();
    });
  });

  describe("search", () => {
    it("filters the ingredient list by name", () => {
      setupMocks([TOMATO, MILK, GARLIC]);
      render(<AddPantryPicker onClose={onClose} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "milk" },
      });

      expect(screen.getByText("Milk")).toBeInTheDocument();
      expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
      expect(screen.queryByText("Garlic")).not.toBeInTheDocument();
    });

    it("matches on English aliases", () => {
      setupMocks([TOMATO]);
      render(<AddPantryPicker onClose={onClose} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "tomatoes" },
      });

      expect(screen.getByText("Tomato")).toBeInTheDocument();
    });

    it("shows empty state when no results match the query", () => {
      setupMocks([TOMATO, MILK]);
      render(<AddPantryPicker onClose={onClose} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "xyz-nonexistent" },
      });

      expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
    });

    it("clears filter and shows groups when search is cleared", () => {
      setupMocks([TOMATO, MILK]);
      render(<AddPantryPicker onClose={onClose} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "milk" },
      });
      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "" },
      });

      expect(screen.getByText("Tomato")).toBeInTheDocument();
      expect(screen.getByText("Milk")).toBeInTheDocument();
    });
  });
});
