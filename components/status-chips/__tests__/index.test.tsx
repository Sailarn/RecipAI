import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusChips } from "../index";

describe("StatusChips", () => {
  it("renders all three options", () => {
    render(<StatusChips active="all" onChange={vi.fn()} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Tried ✓")).toBeInTheDocument();
    expect(screen.getByText("Want to try")).toBeInTheDocument();
  });

  it("calls onChange with 'tried' when Tried chip is clicked", () => {
    const onChange = vi.fn();
    render(<StatusChips active="all" onChange={onChange} />);
    fireEvent.click(screen.getByText("Tried ✓"));
    expect(onChange).toHaveBeenCalledWith("tried");
  });

  it("calls onChange with 'want' when Want chip is clicked", () => {
    const onChange = vi.fn();
    render(<StatusChips active="all" onChange={onChange} />);
    fireEvent.click(screen.getByText("Want to try"));
    expect(onChange).toHaveBeenCalledWith("want");
  });

  it("calls onChange with 'all' when All chip is clicked", () => {
    const onChange = vi.fn();
    render(<StatusChips active="tried" onChange={onChange} />);
    fireEvent.click(screen.getByText("All"));
    expect(onChange).toHaveBeenCalledWith("all");
  });

  it("applies active styles to the active chip", () => {
    render(<StatusChips active="tried" onChange={vi.fn()} />);
    const triedBtn = screen.getByText("Tried ✓");
    expect(triedBtn).toHaveStyle({ fontWeight: "600" });
    const allBtn = screen.getByText("All");
    expect(allBtn).toHaveStyle({ fontWeight: "500" });
  });
});
