import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePullToRefresh } from "../use-pull-to-refresh";

function createTouchEvent(type: string, clientY: number) {
  const event = new Event(type, { bubbles: false, cancelable: true });
  Object.defineProperty(event, "touches", {
    value: type === "touchend" ? [] : [{ clientY }],
  });
  return event;
}

describe("usePullToRefresh", () => {
  it("tracks a pull gesture on the provided scroll container", () => {
    const scrollContainer = document.createElement("div");
    const scrollRef = { current: scrollContainer };
    const { result } = renderHook(() =>
      usePullToRefresh({
        enabled: true,
        onRefresh: vi.fn().mockResolvedValue(undefined),
        scrollRef,
      }),
    );
    const indicator = document.createElement("div");
    result.current.indicatorRef.current = indicator;

    act(() => {
      scrollContainer.dispatchEvent(createTouchEvent("touchstart", 100));
      scrollContainer.dispatchEvent(createTouchEvent("touchmove", 300));
    });

    expect(indicator.style.getPropertyValue("--pull-height")).toBe("80px");
  });

  it("keeps the pull label hidden during a shallow gesture", () => {
    const scrollContainer = document.createElement("div");
    const scrollRef = { current: scrollContainer };
    const { result } = renderHook(() =>
      usePullToRefresh({
        enabled: true,
        onRefresh: vi.fn().mockResolvedValue(undefined),
        scrollRef,
      }),
    );
    const indicator = document.createElement("div");
    result.current.indicatorRef.current = indicator;

    act(() => {
      scrollContainer.dispatchEvent(createTouchEvent("touchstart", 100));
      scrollContainer.dispatchEvent(createTouchEvent("touchmove", 120));
    });

    expect(indicator.style.opacity).toBe("0");
  });

  it("reveals the pull label once it has enough vertical space", () => {
    const scrollContainer = document.createElement("div");
    const scrollRef = { current: scrollContainer };
    const { result } = renderHook(() =>
      usePullToRefresh({
        enabled: true,
        onRefresh: vi.fn().mockResolvedValue(undefined),
        scrollRef,
      }),
    );
    const indicator = document.createElement("div");
    result.current.indicatorRef.current = indicator;

    act(() => {
      scrollContainer.dispatchEvent(createTouchEvent("touchstart", 100));
      scrollContainer.dispatchEvent(createTouchEvent("touchmove", 150));
    });

    expect(indicator.style.opacity).toBe("1");
  });

  it("tracks a pull when iOS reports a negative rubber-band scroll position", () => {
    const scrollContainer = document.createElement("div");
    scrollContainer.scrollTop = -1;
    const scrollRef = { current: scrollContainer };
    const { result } = renderHook(() =>
      usePullToRefresh({
        enabled: true,
        onRefresh: vi.fn().mockResolvedValue(undefined),
        scrollRef,
      }),
    );
    const indicator = document.createElement("div");
    result.current.indicatorRef.current = indicator;

    act(() => {
      scrollContainer.dispatchEvent(createTouchEvent("touchstart", 100));
      scrollContainer.dispatchEvent(createTouchEvent("touchmove", 300));
    });

    expect(indicator.style.getPropertyValue("--pull-height")).toBe("80px");
  });

  it("attaches after the asynchronously rendered scroll container mounts", () => {
    const scrollRef = { current: null as HTMLDivElement | null };
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        usePullToRefresh({
          enabled,
          onRefresh,
          scrollRef,
        }),
      { initialProps: { enabled: false } },
    );
    const scrollContainer = document.createElement("div");
    const indicator = document.createElement("div");
    scrollRef.current = scrollContainer;
    result.current.indicatorRef.current = indicator;

    rerender({ enabled: true });
    act(() => {
      scrollContainer.dispatchEvent(createTouchEvent("touchstart", 100));
      scrollContainer.dispatchEvent(createTouchEvent("touchmove", 300));
    });

    expect(indicator.style.getPropertyValue("--pull-height")).toBe("80px");
  });

  it("refreshes after the gesture reaches the configured threshold", async () => {
    const scrollContainer = document.createElement("div");
    const scrollRef = { current: scrollContainer };
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      usePullToRefresh({
        enabled: true,
        onRefresh,
        scrollRef,
      }),
    );

    act(() => {
      scrollContainer.dispatchEvent(createTouchEvent("touchstart", 100));
      scrollContainer.dispatchEvent(createTouchEvent("touchmove", 180));
      scrollContainer.dispatchEvent(createTouchEvent("touchend", 180));
    });

    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });
});
