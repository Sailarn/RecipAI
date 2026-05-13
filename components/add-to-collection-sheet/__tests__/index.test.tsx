import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Collection } from "@/lib/db/schema";
import { AddToCollectionSheet } from "../index";

const collections: Collection[] = [
  {
    id: "c1",
    name: "Favourites",
    emoji: "⭐",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "c2",
    name: "Light meals",
    emoji: "🥗",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe("AddToCollectionSheet", () => {
  it("renders all collection options", () => {
    render(
      <AddToCollectionSheet
        collections={collections}
        currentCollectionIds={[]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("⭐ Favourites")).toBeInTheDocument();
    expect(screen.getByText("🥗 Light meals")).toBeInTheDocument();
  });

  it("shows checkmark svg for already-added collections", () => {
    render(
      <AddToCollectionSheet
        collections={collections}
        currentCollectionIds={["c1"]}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("check-c1")).toBeInTheDocument();
    expect(screen.queryByTestId("check-c2")).not.toBeInTheDocument();
  });

  it("calls onSelect with collection id when tapped", () => {
    const onSelect = vi.fn();
    render(
      <AddToCollectionSheet
        collections={collections}
        currentCollectionIds={[]}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("⭐ Favourites"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <AddToCollectionSheet
        collections={collections}
        currentCollectionIds={[]}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("sheet-backdrop"));
    fireEvent.animationEnd(screen.getByTestId("sheet-panel"));
    expect(onClose).toHaveBeenCalled();
  });
});
