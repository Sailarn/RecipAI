import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
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
import type { VocabularyIngredient } from "@/lib/db/schema";
import { IngredientPicker } from "../index";

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

function setupVocab(vocab: VocabularyIngredient[]) {
  vi.mocked(useLiveQuery).mockReturnValue(vocab);
}

const countLabel = (count: number) =>
  count > 0 ? `Add ${count}` : "Add items";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IngredientPicker", () => {
  describe("layout", () => {
    it("renders as an opaque fullscreen page with the given title", () => {
      setupVocab([TOMATO]);
      render(
        <IngredientPicker
          title="addTitle"
          onClose={onClose}
          onPick={vi.fn()}
        />,
      );

      expect(screen.getByTestId("ingredient-picker")).toHaveClass(
        "bg-[#080808]",
        "z-[1000]",
      );
      expect(screen.getByTestId("ingredient-picker-mesh")).toHaveClass(
        "[background:var(--app-mesh)]",
      );
      expect(
        screen.getByRole("heading", { name: "addTitle" }),
      ).toBeInTheDocument();
    });

    it("applies a custom testId", () => {
      setupVocab([TOMATO]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          onPick={vi.fn()}
          testId="add-pantry-picker"
        />,
      );

      expect(screen.getByTestId("add-pantry-picker")).toBeInTheDocument();
    });

    it("groups lowercase vocabulary categories", () => {
      setupVocab([GARLIC, MILK, RICE]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

      expect(
        screen.getByRole("heading", { name: "Produce" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Dairy" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "Pantry" }),
      ).toBeInTheDocument();
    });

    it("renders ingredient tiles from confirmed vocab", () => {
      setupVocab([TOMATO, MILK]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

      expect(screen.getByText("Tomato")).toBeInTheDocument();
      expect(screen.getByText("Milk")).toBeInTheDocument();
    });
  });

  describe("single-select", () => {
    it("fires onPick with the tapped ingredient", () => {
      const onPick = vi.fn();
      setupVocab([TOMATO, MILK]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={onPick} />);

      fireEvent.click(screen.getByText("Tomato").closest("button")!);

      expect(onPick).toHaveBeenCalledTimes(1);
      expect(onPick).toHaveBeenCalledWith(TOMATO);
    });

    it("renders no commit bar in single-select mode", () => {
      setupVocab([TOMATO]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

      expect(
        screen.queryByTestId("ingredient-picker-commit"),
      ).not.toBeInTheDocument();
    });
  });

  describe("marked ingredients", () => {
    it("renders marked ingredients as selected but still pickable", () => {
      const onPick = vi.fn();
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          onPick={onPick}
          markedIngredientIds={new Set(["tomato-id"])}
        />,
      );

      const tomatoTile = screen.getByText("Tomato").closest("button");
      expect(tomatoTile).toHaveAttribute("data-state", "selected");
      expect(tomatoTile).not.toBeDisabled();

      fireEvent.click(tomatoTile!);
      expect(onPick).toHaveBeenCalledWith(TOMATO);
    });
  });

  describe("multi-select", () => {
    it("tapping a tile selects it and updates the commit label", () => {
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          commit={{ label: countLabel, onCommit: vi.fn() }}
        />,
      );

      fireEvent.click(screen.getByText("Tomato").closest("button")!);

      expect(screen.getByTestId("ingredient-picker-commit")).toHaveTextContent(
        "Add 1",
      );
    });

    it("tapping a selected tile deselects it", () => {
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          commit={{ label: countLabel, onCommit: vi.fn() }}
        />,
      );

      fireEvent.click(screen.getByText("Tomato").closest("button")!);
      fireEvent.click(screen.getByText("Tomato").closest("button")!);

      expect(screen.getByTestId("ingredient-picker-commit")).toBeDisabled();
    });

    it("commit fires onCommit with the selected ingredients", () => {
      const onCommit = vi.fn();
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          commit={{ label: countLabel, onCommit }}
        />,
      );

      fireEvent.click(screen.getByText("Tomato").closest("button")!);
      fireEvent.click(screen.getByText("Milk").closest("button")!);
      fireEvent.click(screen.getByTestId("ingredient-picker-commit"));

      expect(onCommit).toHaveBeenCalledTimes(1);
      expect(onCommit).toHaveBeenCalledWith([TOMATO, MILK]);
    });

    it("commit button is disabled when nothing is selected", () => {
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          commit={{ label: countLabel, onCommit: vi.fn() }}
        />,
      );

      expect(screen.getByTestId("ingredient-picker-commit")).toBeDisabled();
    });
  });

  describe("disabled ingredients", () => {
    it("renders disabled ingredients as checked without tint or label", () => {
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          commit={{ label: countLabel, onCommit: vi.fn() }}
          disabledIngredientIds={new Set(["tomato-id"])}
        />,
      );

      const tomatoTile = screen.getByText("Tomato").closest("button");
      expect(tomatoTile).toHaveAttribute("data-state", "added");
      expect(tomatoTile).toBeDisabled();
      expect(tomatoTile).not.toHaveClass("bg-[rgba(134,239,172,0.12)]");
    });

    it("does not select a disabled ingredient on click", () => {
      setupVocab([TOMATO, MILK]);
      render(
        <IngredientPicker
          title="t"
          onClose={onClose}
          commit={{ label: countLabel, onCommit: vi.fn() }}
          disabledIngredientIds={new Set(["tomato-id"])}
        />,
      );

      fireEvent.click(screen.getByText("Tomato").closest("button")!);

      expect(screen.getByTestId("ingredient-picker-commit")).toBeDisabled();
    });
  });

  describe("search", () => {
    it("filters the ingredient list by name", () => {
      setupVocab([TOMATO, MILK, GARLIC]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "milk" },
      });

      expect(screen.getByText("Milk")).toBeInTheDocument();
      expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
      expect(screen.queryByText("Garlic")).not.toBeInTheDocument();
    });

    it("matches on English aliases", () => {
      setupVocab([TOMATO]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "tomatoes" },
      });

      expect(screen.getByText("Tomato")).toBeInTheDocument();
    });

    it("shows empty state when no results match the query", () => {
      setupVocab([TOMATO, MILK]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

      fireEvent.change(screen.getByPlaceholderText("Search ingredients…"), {
        target: { value: "xyz-nonexistent" },
      });

      expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
    });

    it("clears filter and shows groups when search is cleared", () => {
      setupVocab([TOMATO, MILK]);
      render(<IngredientPicker title="t" onClose={onClose} onPick={vi.fn()} />);

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
