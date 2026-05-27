import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeListError } from "../index";

describe("RecipeListError", () => {
  it("renders the error message", () => {
    render(<RecipeListError />);

    expect(
      screen.getByText("Something went wrong loading your recipes."),
    ).toBeInTheDocument();
  });

  it("renders a reload button", () => {
    render(<RecipeListError />);

    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });

  it("calls window.location.reload when reload button is clicked", () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    });

    render(<RecipeListError />);
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(reloadMock).toHaveBeenCalledOnce();
  });
});
