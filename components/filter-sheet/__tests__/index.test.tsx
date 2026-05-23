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
    expect(screen.getByText("Sort by")).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders all four sort options", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("Newest first")).toBeInTheDocument();
    expect(screen.getByText("Oldest first")).toBeInTheDocument();
    expect(screen.getByText("A → Z")).toBeInTheDocument();
    expect(screen.getByText("Z → A")).toBeInTheDocument();
  });

  it("calls onSortChange when a sort option is clicked", () => {
    const onSortChange = vi.fn();
    render(<FilterSheet {...defaultProps} onSortChange={onSortChange} />);
    fireEvent.click(screen.getByText("Oldest first"));
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
    fireEvent.click(screen.getByText("Reset"));
    expect(onSortChange).toHaveBeenCalledWith("newest");
    expect(onCategoryChange).toHaveBeenCalledWith(null);
    expect(onStatusChange).toHaveBeenCalledWith(["all"]);
  });

  it("clicking Tried calls onStatusChange with ['tried']", () => {
    const onStatusChange = vi.fn();
    render(<FilterSheet {...defaultProps} onStatusChange={onStatusChange} />);
    fireEvent.click(screen.getByText("Tried ✓"));
    expect(onStatusChange).toHaveBeenCalledWith(["tried"]);
  });

  it("renders Can Cook and Nearly status options", () => {
    render(<FilterSheet {...defaultProps} />);
    expect(screen.getByText("Can Cook 🟢")).toBeInTheDocument();
    expect(screen.getByText("Nearly 🟡")).toBeInTheDocument();
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
