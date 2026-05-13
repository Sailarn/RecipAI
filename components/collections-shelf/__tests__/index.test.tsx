import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Collection } from "@/lib/db/schema";
import { CollectionsShelf } from "../index";

const mockCollections: Collection[] = [
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

describe("CollectionsShelf", () => {
  it("renders All pill and each collection", () => {
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByText("🍴 All")).toBeInTheDocument();
    expect(screen.getByText("⭐ Favourites")).toBeInTheDocument();
    expect(screen.getByText("🥗 Light meals")).toBeInTheDocument();
  });

  it("calls onSelect with null when All is clicked", () => {
    const onSelect = vi.fn();
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("🍴 All"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("calls onSelect with collection id when pill is clicked", () => {
    const onSelect = vi.fn();
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("⭐ Favourites"));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });

  it("calls onCreateNew when + button is clicked", () => {
    const onCreateNew = vi.fn();
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("calls onLongPress with the collection when a pill is long-pressed", () => {
    const onLongPress = vi.fn();
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onLongPress={onLongPress}
      />,
    );
    // Simulate mouse down held for 500ms (longer than the 450ms threshold)
    vi.useFakeTimers();
    fireEvent.mouseDown(screen.getByText("⭐ Favourites"));
    vi.advanceTimersByTime(500);
    expect(onLongPress).toHaveBeenCalledWith(mockCollections[0]);
    vi.useRealTimers();
  });
});
