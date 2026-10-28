/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScrollCollapse } from "../use-scroll-collapse";

function elementAt(top: number): HTMLDivElement {
  const element = document.createElement("div");
  element.getBoundingClientRect = () => ({ top }) as DOMRect;
  return element;
}

function refs(containerTop: number, sentinelTop: number) {
  return {
    scrollRef: { current: elementAt(containerTop) },
    sentinelRef: { current: elementAt(sentinelTop) },
  };
}

describe("useScrollCollapse", () => {
  describe("initial measurement", () => {
    it("is collapsed when the sentinel already sits above the container", () => {
      const { scrollRef, sentinelRef } = refs(100, 40);

      const { result } = renderHook(() =>
        useScrollCollapse(scrollRef, sentinelRef, true),
      );

      expect(result.current).toBe(true);
    });

    it("is expanded while the sentinel is below the container top", () => {
      const { scrollRef, sentinelRef } = refs(100, 140);

      const { result } = renderHook(() =>
        useScrollCollapse(scrollRef, sentinelRef, true),
      );

      expect(result.current).toBe(false);
    });
  });

  describe("scrolling", () => {
    it("collapses once a scroll moves the sentinel past the top", () => {
      const { scrollRef, sentinelRef } = refs(100, 140);
      const { result } = renderHook(() =>
        useScrollCollapse(scrollRef, sentinelRef, true),
      );

      sentinelRef.current.getBoundingClientRect = () =>
        ({ top: 20 }) as DOMRect;
      act(() => {
        scrollRef.current.dispatchEvent(new Event("scroll"));
      });

      expect(result.current).toBe(true);
    });

    it("ignores scrolling while disabled", () => {
      const { scrollRef, sentinelRef } = refs(100, 40);
      const { result } = renderHook(() =>
        useScrollCollapse(scrollRef, sentinelRef, false),
      );

      act(() => {
        scrollRef.current.dispatchEvent(new Event("scroll"));
      });

      expect(result.current).toBe(false);
    });
  });
});
