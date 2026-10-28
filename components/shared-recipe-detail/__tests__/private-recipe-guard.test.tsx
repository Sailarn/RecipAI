/** @vitest-environment happy-dom */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateRecipeGuard } from "../private-recipe-guard";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { seconds?: number }) =>
    values?.seconds === undefined ? key : `${key} ${values.seconds}s`,
}));

const navigation = vi.hoisted(() => ({ back: vi.fn() }));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ back: navigation.back }),
}));

describe("PrivateRecipeGuard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => vi.useRealTimers());

  it("returns to recipes after four seconds", async () => {
    render(<PrivateRecipeGuard locale="en" />);
    await act(() => vi.advanceTimersByTimeAsync(4_000));
    expect(navigation.back).toHaveBeenCalledWith("/en/recipes");
  });

  it("still redirects when the countdown re-renders every second", async () => {
    render(<PrivateRecipeGuard locale="en" />);

    for (let second = 0; second < 4; second++) {
      await act(() => vi.advanceTimersByTimeAsync(1_000));
    }

    expect(navigation.back).toHaveBeenCalledWith("/en/recipes");
    expect(screen.getByText(/0s/)).toBeTruthy();
  });

  it("pops the navigation stack (not a bare URL replace) when the button is clicked", () => {
    // navigate.back(fallback) pops a pushed stack overlay; navigate.replace()
    // only changes the URL and leaves the overlay stuck on screen — this is
    // the pushed-recipe-detail case (Telegram deep link), so it must be back().
    render(<PrivateRecipeGuard locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: "backToRecipes" }));
    expect(navigation.back).toHaveBeenCalledWith("/en/recipes");
  });
});
