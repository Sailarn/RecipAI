import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StatusFilter } from "@/components/status-chips";
import type { Collection } from "@/lib/db/schema";
import { CompactFilterBar } from "../index";

const collections: Collection[] = [
  {
    id: "c1",
    name: "Favourites",
    emoji: "⭐",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultProps = {
  activeCollectionId: null as string | null,
  collections,
  search: "",
  sort: "newest" as const,
  category: null as string | null,
  status: ["all"] as StatusFilter,
  onScrollTop: vi.fn(),
};

describe("CompactFilterBar", () => {
  it("always renders the up arrow", () => {
    render(<CompactFilterBar {...defaultProps} />);
    expect(screen.getByLabelText("scroll to top")).toBeInTheDocument();
  });

  it("renders All amber chip when no collection is active", () => {
    render(<CompactFilterBar {...defaultProps} />);
    expect(screen.getByText("🍴 All")).toBeInTheDocument();
  });

  it("renders collection name amber chip when a collection is active", () => {
    render(<CompactFilterBar {...defaultProps} activeCollectionId="c1" />);
    expect(screen.getByText("⭐ Favourites")).toBeInTheDocument();
  });

  it("renders blue chip for search query when search is non-empty", () => {
    render(<CompactFilterBar {...defaultProps} search="pasta" />);
    expect(screen.getByText("pasta")).toBeInTheDocument();
  });

  it("does not render search chip when search is empty", () => {
    render(<CompactFilterBar {...defaultProps} search="" />);
    expect(screen.queryByTestId("search-chip")).not.toBeInTheDocument();
  });

  it("renders violet chip for active category", () => {
    render(<CompactFilterBar {...defaultProps} category="Dinner" />);
    expect(screen.getByText("Dinner")).toBeInTheDocument();
  });

  it("renders violet chip for non-default status", () => {
    render(<CompactFilterBar {...defaultProps} status={["tried"]} />);
    expect(screen.getByText("statusTried")).toBeInTheDocument();
  });

  it("renders violet chips for multiple active statuses", () => {
    render(<CompactFilterBar {...defaultProps} status={["tried", "nearly"]} />);
    expect(screen.getByText("statusTried")).toBeInTheDocument();
    expect(screen.getByText("statusNearlyShort")).toBeInTheDocument();
  });

  it("renders violet chip for non-default sort", () => {
    render(<CompactFilterBar {...defaultProps} sort="az" />);
    expect(screen.getByText("sortAZ")).toBeInTheDocument();
  });

  it("does not render chips for default filter values", () => {
    render(
      <CompactFilterBar
        {...defaultProps}
        sort="newest"
        status={["all"]}
        category={null}
        search=""
      />,
    );
    expect(screen.queryByTestId("search-chip")).not.toBeInTheDocument();
    expect(screen.queryByText("statusTried")).not.toBeInTheDocument();
    expect(screen.queryByText("sortAZ")).not.toBeInTheDocument();
  });

  it("calls onScrollTop when the bar is tapped", () => {
    const onScrollTop = vi.fn();
    render(<CompactFilterBar {...defaultProps} onScrollTop={onScrollTop} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onScrollTop).toHaveBeenCalled();
  });
});
