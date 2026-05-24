import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusChips, type StatusFilter, toggleStatus } from "../index";

describe("toggleStatus", () => {
  it("selecting 'all' always returns ['all']", () => {
    expect(toggleStatus(["tried"], "all")).toEqual(["all"]);
  });

  it("selecting an inactive key adds it and removes 'all'", () => {
    const result = toggleStatus(["all"], "tried");
    expect(result).toEqual(["tried"]);
  });

  it("selecting an active key removes it", () => {
    const result = toggleStatus(["tried", "nearly"], "tried");
    expect(result).toEqual(["nearly"]);
  });

  it("removing the last non-all key falls back to ['all']", () => {
    const result = toggleStatus(["tried"], "tried");
    expect(result).toEqual(["all"]);
  });

  it("multi-select: adding 'nearly' to ['tried']", () => {
    const result = toggleStatus(["tried"], "nearly");
    expect(result).toContain("tried");
    expect(result).toContain("nearly");
  });
});

describe("StatusChips", () => {
  it("renders all status options", () => {
    render(<StatusChips active={["all"]} onChange={vi.fn()} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Tried ✓")).toBeInTheDocument();
    expect(screen.getByText("Can Cook 🟢")).toBeInTheDocument();
    expect(screen.getByText("Half+ 🟡")).toBeInTheDocument();
  });

  it("does not render Want to try chip", () => {
    render(<StatusChips active={["all"]} onChange={vi.fn()} />);
    expect(screen.queryByText("Want to try")).not.toBeInTheDocument();
  });

  it("calls onChange with ['tried'] when Tried chip is clicked from 'all'", () => {
    const onChange = vi.fn();
    render(<StatusChips active={["all"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Tried ✓"));
    expect(onChange).toHaveBeenCalledWith(["tried"]);
  });

  it("calls onChange with ['all'] when All chip is clicked", () => {
    const onChange = vi.fn();
    render(<StatusChips active={["tried"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("All"));
    expect(onChange).toHaveBeenCalledWith(["all"]);
  });

  it("calls onChange with ['cancook'] when Can Cook chip is clicked from 'all'", () => {
    const onChange = vi.fn();
    render(<StatusChips active={["all"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Can Cook 🟢"));
    expect(onChange).toHaveBeenCalledWith(["cancook"]);
  });

  it("adds 'nearly' to existing selection", () => {
    const onChange = vi.fn();
    render(<StatusChips active={["tried"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Half+ 🟡"));
    const called = onChange.mock.calls[0][0] as StatusFilter;
    expect(called).toContain("tried");
    expect(called).toContain("nearly");
  });

  it("applies active styles to the active chip", () => {
    render(<StatusChips active={["tried"]} onChange={vi.fn()} />);
    const triedBtn = screen.getByText("Tried ✓");
    expect(triedBtn).toHaveStyle({ fontWeight: "600" });
    const allBtn = screen.getByText("All");
    expect(allBtn).toHaveStyle({ fontWeight: "500" });
  });
});
