import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "../use-long-press";

describe("useLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onLongPress after 450ms hold", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onMouseDown());
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(450));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onLongPress if released before 450ms", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onMouseDown());
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onMouseUp());
    act(() => vi.advanceTimersByTime(300));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on mouse leave", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onMouseDown());
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onMouseLeave());
    act(() => vi.advanceTimersByTime(300));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("returns handlers object with mouse and touch events", () => {
    const { result } = renderHook(() => useLongPress(vi.fn()));
    expect(result.current).toHaveProperty("onMouseDown");
    expect(result.current).toHaveProperty("onMouseUp");
    expect(result.current).toHaveProperty("onMouseLeave");
    expect(result.current).toHaveProperty("onTouchStart");
    expect(result.current).toHaveProperty("onTouchEnd");
  });
});
