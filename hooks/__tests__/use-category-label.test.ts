/**
 * @vitest-environment happy-dom
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCategoryLabel } from "../use-category-label";

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

describe("useCategoryLabel", () => {
  it("translates a known category", () => {
    const { result } = renderHook(() => useCategoryLabel());

    expect(result.current("Dessert")).toBe("categories.Dessert");
  });

  it("passes an unknown category through unchanged", () => {
    const { result } = renderHook(() => useCategoryLabel());

    expect(result.current("Street food")).toBe("Street food");
  });

  it.each([null, undefined, ""])("returns an empty label for %j", (value) => {
    const { result } = renderHook(() => useCategoryLabel());

    expect(result.current(value)).toBe("");
  });
});
