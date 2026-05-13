import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Collection } from "@/lib/db/schema";
import { EditCollectionModal } from "../index";

const collection: Collection = {
  id: "c1",
  name: "Favourites",
  emoji: "⭐",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("EditCollectionModal", () => {
  it("renders pre-filled name input and title", () => {
    render(
      <EditCollectionModal
        collection={collection}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue("Favourites")).toBeInTheDocument();
    expect(screen.getByText("Edit Collection")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <EditCollectionModal
        collection={collection}
        onClose={onClose}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("edit-modal-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSave with updated name when changed and saved", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <EditCollectionModal
        collection={collection}
        onClose={onClose}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Favourites"), {
      target: { value: "Faves" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith({ name: "Faves", emoji: "⭐" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not call onSave when name and emoji are unchanged", () => {
    const onSave = vi.fn();
    render(
      <EditCollectionModal
        collection={collection}
        onClose={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onDelete and onClose when delete button is clicked", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <EditCollectionModal
        collection={collection}
        onClose={onClose}
        onSave={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByText("Delete collection"));
    expect(onDelete).toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
