import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeCardContextMenu } from "../index";

const baseProps = {
  status: null as "tried" | "want" | null,
  pos: { x: 100, y: 200 },
  onClose: vi.fn(),
  onToggleStatus: vi.fn(),
  onAddToCollection: vi.fn(),
  onDelete: vi.fn(),
};

describe("RecipeCardContextMenu", () => {
  it("renders all three menu items", () => {
    render(<RecipeCardContextMenu {...baseProps} />);
    expect(screen.getByText("Mark as tried")).toBeInTheDocument();
    expect(screen.getByText("Add to collection")).toBeInTheDocument();
    expect(screen.getByText("Delete recipe")).toBeInTheDocument();
  });

  it("shows 'Mark as untried' when status is tried", () => {
    render(<RecipeCardContextMenu {...baseProps} status="tried" />);
    expect(screen.getByText("Mark as untried")).toBeInTheDocument();
  });

  it("shows 'Mark as tried' when status is want", () => {
    render(<RecipeCardContextMenu {...baseProps} status="want" />);
    expect(screen.getByText("Mark as tried")).toBeInTheDocument();
  });

  it("calls onToggleStatus when status item is clicked", () => {
    const onToggleStatus = vi.fn();
    render(
      <RecipeCardContextMenu {...baseProps} onToggleStatus={onToggleStatus} />,
    );
    fireEvent.click(screen.getByText("Mark as tried"));
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
    fireEvent.click(screen.getByText("Add to collection"));
    expect(onAddToCollection).toHaveBeenCalled();
  });

  it("calls onDelete when Delete is clicked", () => {
    const onDelete = vi.fn();
    render(<RecipeCardContextMenu {...baseProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Delete recipe"));
    expect(onDelete).toHaveBeenCalled();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<RecipeCardContextMenu {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("ctx-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });
});
