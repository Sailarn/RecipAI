/**
 * @vitest-environment happy-dom
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/transitions");

const router = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const stack = vi.hoisted(() => ({
  entries: [],
  push: vi.fn(),
  pop: vi.fn(),
  reset: vi.fn(),
  replaceTop: vi.fn(),
  canPop: false,
}));
vi.mock("@/lib/navigation-stack", () => ({
  useNavigationStack: () => ({ ...stack }),
}));

import { useNavigate } from "../transitions";

describe("useNavigate", () => {
  it("returns the same object across re-renders", () => {
    const { result, rerender } = renderHook(() => useNavigate());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("pops a pushed view when the stack can pop", () => {
    stack.canPop = true;
    const { result } = renderHook(() => useNavigate());

    result.current.back("/en/recipes");

    expect(stack.pop).toHaveBeenCalledOnce();
    expect(router.replace).not.toHaveBeenCalled();
    stack.canPop = false;
  });

  it("falls back to replacing the URL when there is nothing to pop", () => {
    const { result } = renderHook(() => useNavigate());

    result.current.back("/en/recipes");

    expect(router.replace).toHaveBeenCalledWith("/en/recipes");
  });

  it("pushes onto the stack only when given an element", () => {
    const { result } = renderHook(() => useNavigate());

    result.current.push("/en/pantry");

    expect(router.push).toHaveBeenCalledWith("/en/pantry");
    expect(stack.push).not.toHaveBeenCalled();
  });
});
