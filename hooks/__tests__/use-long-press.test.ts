import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "../use-long-press";

const makePointerEvent = (x = 0, y = 0) =>
  ({ clientX: x, clientY: y }) as React.PointerEvent;

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

    act(() => result.current.onPointerDown(makePointerEvent()));
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(450));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("passes pointer coordinates to onLongPress", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(makePointerEvent(120, 340)));
    act(() => vi.advanceTimersByTime(450));

    expect(onLongPress).toHaveBeenCalledWith({ x: 120, y: 340 });
  });

  it("does not call onLongPress if released before 450ms", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(makePointerEvent()));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onPointerUp());
    act(() => vi.advanceTimersByTime(300));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on pointer leave", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(makePointerEvent()));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onPointerLeave());
    act(() => vi.advanceTimersByTime(300));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on pointer cancel", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(makePointerEvent()));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onPointerCancel());
    act(() => vi.advanceTimersByTime(300));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels if pointer moves more than 8px", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(makePointerEvent(0, 0)));
    act(
      () => result.current.onPointerMove(makePointerEvent(10, 0)), // 10px > 8px threshold
    );
    act(() => vi.advanceTimersByTime(450));

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("does not cancel on small pointer movement (< 8px)", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress));

    act(() => result.current.onPointerDown(makePointerEvent(0, 0)));
    act(
      () => result.current.onPointerMove(makePointerEvent(3, 3)), // ~4.2px — under threshold
    );
    act(() => vi.advanceTimersByTime(450));

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when released before long press fires", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, onCancel));

    act(() => result.current.onPointerDown(makePointerEvent()));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.onPointerUp());

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("does NOT call onCancel when released after long press fires", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() => useLongPress(onLongPress, onCancel));

    act(() => result.current.onPointerDown(makePointerEvent()));
    act(() => vi.advanceTimersByTime(450)); // long press fires
    act(() => result.current.onPointerUp()); // release after fire

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled(); // ← key: didLongPress state is preserved
  });

  it("returns handlers object with pointer events", () => {
    const { result } = renderHook(() => useLongPress(vi.fn()));
    expect(result.current).toHaveProperty("onPointerDown");
    expect(result.current).toHaveProperty("onPointerUp");
    expect(result.current).toHaveProperty("onPointerLeave");
    expect(result.current).toHaveProperty("onPointerCancel");
    expect(result.current).toHaveProperty("onPointerMove");
    expect(result.current).toHaveProperty("onContextMenu");
  });
});
