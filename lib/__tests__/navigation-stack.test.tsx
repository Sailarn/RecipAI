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
      <span data-testid="top-content">
        {stack.entries[stack.entries.length - 1]?.element}
      </span>
      <button
        type="button"
        onClick={() => stack.push("/en/recipes/1", <div>Recipe</div>)}
      >
        Push
      </button>
      <button type="button" onClick={stack.pop}>
        Pop
      </button>
      <button
        type="button"
        onClick={() => stack.replaceTop("/en/recipes/2", <div>Owned copy</div>)}
      >
        ReplaceTop
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

  describe("replaceTop", () => {
    it("swaps the top entry's element without changing the stack depth", () => {
      const replaceStateSpy = vi.spyOn(history, "replaceState");
      const pushStateSpy = vi.spyOn(history, "pushState");
      renderProvider();

      act(() => screen.getByRole("button", { name: "Push" }).click());
      expect(screen.getByTestId("entries")).toHaveTextContent("2");
      pushStateSpy.mockClear();

      act(() => screen.getByRole("button", { name: "ReplaceTop" }).click());

      // Same depth — the entry below (recipes list) is still exactly one pop away.
      expect(screen.getByTestId("entries")).toHaveTextContent("2");
      expect(screen.getByTestId("top-content")).toHaveTextContent("Owned copy");
      expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/en/recipes/2");
      // Doesn't add a new history entry — that's the whole point.
      expect(pushStateSpy).not.toHaveBeenCalled();
    });

    it("pops straight to the entry beneath after a replaceTop, not back to the replaced one", () => {
      const backSpy = vi.spyOn(history, "back").mockImplementation(() => {});
      renderProvider();

      act(() => screen.getByRole("button", { name: "Push" }).click());
      act(() => screen.getByRole("button", { name: "ReplaceTop" }).click());
      act(() => screen.getByRole("button", { name: "Pop" }).click());

      expect(backSpy).toHaveBeenCalledOnce();
      act(() => window.dispatchEvent(new PopStateEvent("popstate")));
      expect(screen.getByTestId("entries")).toHaveTextContent("1");
    });
  });
});
