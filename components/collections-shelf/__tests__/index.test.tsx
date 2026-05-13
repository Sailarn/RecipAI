import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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
    fireEvent.mouseDown(screen.getByText("⭐ Favourites"));
    vi.advanceTimersByTime(500);
    fireEvent.mouseUp(screen.getByText("⭐ Favourites"));
    expect(onLongPress).toHaveBeenCalledWith(mockCollections[0]);
  });

  it("does not call onSelect when a pill is long-pressed", () => {
    const onSelect = vi.fn();
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={onSelect}
        onCreateNew={vi.fn()}
        onLongPress={vi.fn()}
      />,
    );
    fireEvent.mouseDown(screen.getByText("⭐ Favourites"));
    vi.advanceTimersByTime(500);
    fireEvent.click(screen.getByText("⭐ Favourites"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
