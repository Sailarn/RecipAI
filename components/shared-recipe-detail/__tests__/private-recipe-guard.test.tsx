/** @vitest-environment happy-dom */
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateRecipeGuard } from "../private-recipe-guard";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ replace: navigation.replace }),
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
    expect(navigation.replace).toHaveBeenCalledWith("/en/recipes");
  });
});
