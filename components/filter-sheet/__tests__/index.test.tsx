import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StatusFilter } from "@/components/status-chips";
import { FilterSheet } from "../index";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  sort: "newest" as const,
  onSortChange: vi.fn(),
  category: null as string | null,
  onCategoryChange: vi.fn(),
  status: ["all"] as StatusFilter,
  onStatusChange: vi.fn(),
};

describe("FilterSheet", () => {
  it("renders Sort by, Category, and Status sections", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("sortBy")).toBeInTheDocument();
    expect(screen.getByText("category")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
  });

  it("renders all four sort options", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("sortNewest")).toBeInTheDocument();
    expect(screen.getByText("sortOldest")).toBeInTheDocument();
    expect(screen.getByText("sortAZ")).toBeInTheDocument();
    expect(screen.getByText("sortZA")).toBeInTheDocument();
  });

  it("calls onSortChange when a sort option is clicked", () => {
    const onSortChange = vi.fn();
    render(<FilterSheet {...defaultProps} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByText("sortOldest"));
    expect(onSortChange).toHaveBeenCalledWith("oldest");
  });

  it("calls all reset handlers when Reset is clicked", () => {
    const onSortChange = vi.fn();
    const onCategoryChange = vi.fn();
    const onStatusChange = vi.fn();
    render(
      <FilterSheet
        {...defaultProps}
        sort="az"
        category="Dinner"
        status={["tried"]}
        onSortChange={onSortChange}
        onCategoryChange={onCategoryChange}
        onStatusChange={onStatusChange}
      />,
    );
    fireEvent.click(screen.getByText("reset"));
    expect(onSortChange).toHaveBeenCalledWith("newest");
    expect(onCategoryChange).toHaveBeenCalledWith(null);
    expect(onStatusChange).toHaveBeenCalledWith(["all"]);
  });

  it("clicking Tried calls onStatusChange with ['tried']", () => {
    const onStatusChange = vi.fn();
    render(<FilterSheet {...defaultProps} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByText("statusTried"));
    expect(onStatusChange).toHaveBeenCalledWith(["tried"]);
  });

  it("renders Can Cook and Nearly status options", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("statusCanCook")).toBeInTheDocument();
    expect(screen.getByText("statusNearly")).toBeInTheDocument();
  });

  it("renders category options including Breakfast", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
  });

  it("calls onCategoryChange when a category is clicked", () => {
    const onCategoryChange = vi.fn();
    render(
      <FilterSheet {...defaultProps} onCategoryChange={onCategoryChange} />,
    );
    fireEvent.click(screen.getByText("Dinner"));
    expect(onCategoryChange).toHaveBeenCalledWith("Dinner");
  });

  it("calls onCategoryChange with null when active category is clicked again", () => {
    const onCategoryChange = vi.fn();
    render(
      <FilterSheet
        {...defaultProps}
        category="Dinner"
        onCategoryChange={onCategoryChange}
      />,
    );
    fireEvent.click(screen.getByText("Dinner"));
    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });
});
