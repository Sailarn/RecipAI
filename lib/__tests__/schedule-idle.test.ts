import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleIdle } from "../schedule-idle";

describe("scheduleIdle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses requestIdleCallback when available", () => {
    const requestIdleCallback = vi.fn();
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);
    const callback = vi.fn();

    scheduleIdle(callback);

    expect(requestIdleCallback).toHaveBeenCalledWith(
      callback,
      expect.objectContaining({ timeout: 2000 }),
    );
  });

  it("falls back to setTimeout when requestIdleCallback is unavailable", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.useFakeTimers();
    const callback = vi.fn();

    scheduleIdle(callback);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
