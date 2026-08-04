import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { RecipeCardContextMenu } from "../index";

const baseProps = {
  status: null as "tried" | null,
  position: { x: 100, y: 200 },
  onClose: vi.fn(),
  onToggleStatus: vi.fn(),
  onAddToCollection: vi.fn(),
  onDelete: vi.fn(),
};

describe("RecipeCardContextMenu", () => {
  it("renders all three menu items", () => {
    render(<RecipeCardContextMenu {...baseProps} />);
    expect(screen.getByText("markTried")).toBeInTheDocument();
    expect(screen.getByText("addToCollection")).toBeInTheDocument();
    expect(screen.getByText("deleteRecipe")).toBeInTheDocument();
  });

  it("shows 'markUntried' when status is tried", () => {
    render(<RecipeCardContextMenu {...baseProps} status="tried" />);
    expect(screen.getByText("markUntried")).toBeInTheDocument();
  });

  it("shows 'markTried' when status is null", () => {
    render(<RecipeCardContextMenu {...baseProps} status={null} />);
    expect(screen.getByText("markTried")).toBeInTheDocument();
  });

  it("calls onToggleStatus when status item is clicked", () => {
    const onToggleStatus = vi.fn();
    render(
      <RecipeCardContextMenu {...baseProps} onToggleStatus={onToggleStatus} />,
    );
    fireEvent.click(screen.getByText("markTried"));
    expect(onToggleStatus).toHaveBeenCalled();
  });

  it("calls onAddToCollection when Add to collection is clicked", () => {
    const onAddToCollection = vi.fn();
    render(
      <RecipeCardContextMenu
        {...baseProps}
        onAddToCollection={onAddToCollection}
      />,
    );
    fireEvent.click(screen.getByText("addToCollection"));
    expect(onAddToCollection).toHaveBeenCalled();
  });

  it("calls onDelete when Delete is clicked", () => {
    const onDelete = vi.fn();
    render(<RecipeCardContextMenu {...baseProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("deleteRecipe"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<RecipeCardContextMenu {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("ctx-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
