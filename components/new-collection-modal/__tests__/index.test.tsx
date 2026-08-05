import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewCollectionModal } from "../index";

describe("NewCollectionModal", () => {
  it("renders the modal with title and input", () => {
    render(<NewCollectionModal onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText("newCollection")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("collectionNamePlaceholder"),
    ).toBeInTheDocument();
  });

  it("Create button is disabled when name is empty", () => {
    render(<NewCollectionModal onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "create" })).toBeDisabled();
  });

  it("Create button enables when name is typed", () => {
    render(<NewCollectionModal onClose={vi.fn()} onCreate={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("collectionNamePlaceholder"), {
      target: { value: "Favourites" },
    });
    expect(screen.getByRole("button", { name: "create" })).not.toBeDisabled();
  });

  it("calls onCreate with name and selected emoji", () => {
    const onCreate = vi.fn();
    render(<NewCollectionModal onClose={vi.fn()} onCreate={onCreate} />);
    fireEvent.change(screen.getByPlaceholderText("collectionNamePlaceholder"), {
      target: { value: "Faves" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create" }));
    expect(onCreate).toHaveBeenCalledWith({ name: "Faves", emoji: "⭐" });
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<NewCollectionModal onClose={onClose} onCreate={vi.fn()} />);
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    fireEvent.animationEnd(screen.getByTestId("sheet-panel"));
    expect(onClose).toHaveBeenCalled();
  });
});
