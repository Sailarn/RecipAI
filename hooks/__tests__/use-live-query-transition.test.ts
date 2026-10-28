/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveQueryTransition } from "../use-live-query-transition";

interface Observer {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
}

const subscriptions = vi.hoisted(
  () => [] as Array<{ observer: Observer; unsubscribe: () => void }>,
);

vi.mock("dexie", () => ({
  liveQuery: () => ({
    subscribe: (observer: Observer) => {
      const subscription = { observer, unsubscribe: vi.fn() };
      subscriptions.push(subscription);
      return { unsubscribe: subscription.unsubscribe };
    },
  }),
}));

function latest() {
  return subscriptions[subscriptions.length - 1];
}

describe("useLiveQueryTransition", () => {
  beforeEach(() => {
    subscriptions.length = 0;
  });

  it("is undefined until the first result arrives", () => {
    const { result } = renderHook(() => useLiveQueryTransition(() => [1], []));

    expect(result.current).toBeUndefined();
  });

  it("returns the first result and later updates", () => {
    const { result } = renderHook(() => useLiveQueryTransition(() => [1], []));

    act(() => latest().observer.next(["first"]));
    expect(result.current).toEqual(["first"]);

    act(() => latest().observer.next(["second"]));
    expect(result.current).toEqual(["second"]);
  });

  it("resubscribes when the deps change", () => {
    const { rerender } = renderHook(
      ({ id }) => useLiveQueryTransition(() => id, [id]),
      { initialProps: { id: "a" } },
    );
    const first = latest();

    rerender({ id: "b" });

    expect(first.unsubscribe).toHaveBeenCalledOnce();
    expect(subscriptions).toHaveLength(2);
  });

  it("does not resubscribe when only onError changes", () => {
    const { rerender } = renderHook(
      ({ onError }) => useLiveQueryTransition(() => 1, [], onError),
      { initialProps: { onError: vi.fn() } },
    );

    rerender({ onError: vi.fn() });

    expect(subscriptions).toHaveLength(1);
  });

  it("calls the current onError, not the one it subscribed with", () => {
    const staleOnError = vi.fn();
    const currentOnError = vi.fn();
    const { rerender } = renderHook(
      ({ onError }) => useLiveQueryTransition(() => 1, [], onError),
      { initialProps: { onError: staleOnError } },
    );
    rerender({ onError: currentOnError });

    act(() => latest().observer.error(new Error("DatabaseClosedError")));

    expect(currentOnError).toHaveBeenCalledOnce();
    expect(staleOnError).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useLiveQueryTransition(() => 1, []));

    unmount();

    expect(latest().unsubscribe).toHaveBeenCalledOnce();
  });
});
