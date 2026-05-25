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

  it("renders All tab and each collection tab", () => {
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

  it("active tab has amber bottom border", () => {
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    const allTab = screen.getByText("🍴 All");
    expect(allTab).toHaveStyle({
      borderBottom: "2px solid rgba(251,191,36,0.9)",
    });
  });

  it("inactive tab has no bottom border", () => {
    render(
      <CollectionsShelf
        collections={mockCollections}
        activeId={null}
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    const favTab = screen.getByText("⭐ Favourites");
    expect(favTab).toHaveStyle({ borderBottom: "2px solid transparent" });
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

  it("calls onSelect with collection id when tab is clicked", () => {
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

  it("calls onLongPress with the collection when a tab is long-pressed", () => {
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
    fireEvent.pointerDown(screen.getByText("⭐ Favourites"));
    vi.advanceTimersByTime(500);
    fireEvent.pointerUp(screen.getByText("⭐ Favourites"));
    expect(onLongPress).toHaveBeenCalledWith(mockCollections[0]);
  });

  it("does not call onSelect when a tab is long-pressed", () => {
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
    fireEvent.pointerDown(screen.getByText("⭐ Favourites"));
    vi.advanceTimersByTime(500);
    fireEvent.click(screen.getByText("⭐ Favourites"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
