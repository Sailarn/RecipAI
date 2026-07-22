/** @vitest-environment happy-dom */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateRecipeGuard } from "../private-recipe-guard";

const navigation = vi.hoisted(() => ({ back: vi.fn() }));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ back: navigation.back }),
}));

describe("PrivateRecipeGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  it("returns to recipes after four seconds", async () => {
    render(<PrivateRecipeGuard locale="en" />);
    await act(() => vi.advanceTimersByTimeAsync(4_000));
    expect(navigation.back).toHaveBeenCalledWith("/en/recipes");
  });

  it("pops the navigation stack (not a bare URL replace) when the button is clicked", () => {
    // navigate.back(fallback) pops a pushed stack overlay; navigate.replace()
    // only changes the URL and leaves the overlay stuck on screen — this is
    // the pushed-recipe-detail case (Telegram deep link), so it must be back().
    render(<PrivateRecipeGuard locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: /back to recipes/i }));
    expect(navigation.back).toHaveBeenCalledWith("/en/recipes");
  });
});
