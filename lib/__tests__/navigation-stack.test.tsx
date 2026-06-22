/**
 * @vitest-environment happy-dom
 */

import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/recipes",
}));

import {
  clearNativePopPending,
  isNativePopPending,
  NavigationStackProvider,
  useNavigationStack,
} from "@/lib/navigation-stack";

function StackControls() {
  const stack = useNavigationStack();

  return (
    <>
      <span data-testid="entries">{stack.entries.length}</span>
      <button
        type="button"
        onClick={() => stack.push("/en/recipes/1", <div>Recipe</div>)}
      >
        Push
      </button>
      <button type="button" onClick={stack.pop}>
        Pop
      </button>
    </>
  );
}

function renderProvider(currentPage: ReactNode = <div>Recipes</div>) {
  return render(
    <NavigationStackProvider
      initialHref="/en/recipes"
      currentPage={currentPage}
    >
      <StackControls />
    </NavigationStackProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  clearNativePopPending();
  history.replaceState(null, "", "/en/recipes");
});

describe("NavigationStackProvider", () => {
  it("consumes the pushed browser entry on a programmatic pop", () => {
    const backSpy = vi.spyOn(history, "back").mockImplementation(() => {});
    const pushStateSpy = vi.spyOn(history, "pushState");
    renderProvider();

    act(() => screen.getByRole("button", { name: "Push" }).click());
    expect(screen.getByTestId("entries")).toHaveTextContent("2");

    act(() => screen.getByRole("button", { name: "Pop" }).click());

    expect(backSpy).toHaveBeenCalledOnce();
    expect(pushStateSpy).toHaveBeenCalledOnce();

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));
    expect(screen.getByTestId("entries")).toHaveTextContent("1");
    expect(isNativePopPending()).toBe(false);
  });

  it("marks a browser-initiated pop as native", () => {
    renderProvider();
    act(() => screen.getByRole("button", { name: "Push" }).click());

    act(() => window.dispatchEvent(new PopStateEvent("popstate")));

    expect(screen.getByTestId("entries")).toHaveTextContent("1");
    expect(isNativePopPending()).toBe(true);
  });
});
