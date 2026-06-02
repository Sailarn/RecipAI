import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmbedDownload } from "../use-embed-download";

function fireProgress(progress: number) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent("embed-model-progress", { detail: { progress } }),
    );
  });
}

function fireLoaded() {
  act(() => {
    window.dispatchEvent(new CustomEvent("embed-model-loaded"));
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEmbedDownload", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useEmbedDownload());

    expect(result.current.phase).toBe("idle");
    expect(result.current.progress).toBe(0);
  });

  it("moves to downloading and tracks progress on progress events", () => {
    const { result } = renderHook(() => useEmbedDownload());

    fireProgress(42);

    expect(result.current.phase).toBe("downloading");
    expect(result.current.progress).toBe(42);
  });

  it("moves to done at 100% on the loaded event", () => {
    const { result } = renderHook(() => useEmbedDownload());

    fireProgress(80);
    fireLoaded();

    expect(result.current.phase).toBe("done");
    expect(result.current.progress).toBe(100);
  });

  it("auto-clears back to idle after the done delay", () => {
    const { result } = renderHook(() => useEmbedDownload());

    fireLoaded();
    expect(result.current.phase).toBe("done");

    act(() => {
      vi.advanceTimersByTime(1800);
    });

    expect(result.current.phase).toBe("idle");
    expect(result.current.progress).toBe(0);
  });
});
