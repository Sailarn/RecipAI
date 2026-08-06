import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }));

vi.mock("@/lib/telemetry", () => ({ trackEvent }));

import {
  resolveOutcome,
  STUCK_AFTER_MS,
  useResolutionOutcome,
} from "../use-resolution-outcome";

const pending = {
  loading: false,
  hasRecipe: false,
  hasPublicRecipe: false,
  publicCheckDone: false,
  ownerPullDone: false,
  awaitingTelegramAutoSignIn: false,
};

describe("resolveOutcome", () => {
  it("is pending while the Dexie read is in flight", () => {
    expect(resolveOutcome({ ...pending, loading: true })).toBeNull();
  });

  it("resolves local when the recipe is on the device", () => {
    expect(resolveOutcome({ ...pending, hasRecipe: true })).toBe("local");
  });

  it("prefers the device copy over a fetched public one", () => {
    expect(
      resolveOutcome({ ...pending, hasRecipe: true, hasPublicRecipe: true }),
    ).toBe("local");
  });

  it("resolves shared for a public recipe not on the device", () => {
    expect(resolveOutcome({ ...pending, hasPublicRecipe: true })).toBe(
      "shared",
    );
  });

  it("stays pending until the public check finishes", () => {
    expect(resolveOutcome({ ...pending, ownerPullDone: true })).toBeNull();
  });

  it("stays pending while a Telegram sign-in is still settling", () => {
    expect(
      resolveOutcome({
        ...pending,
        publicCheckDone: true,
        ownerPullDone: true,
        awaitingTelegramAutoSignIn: true,
      }),
    ).toBeNull();
  });

  it("stays pending until the owner pull finishes", () => {
    expect(resolveOutcome({ ...pending, publicCheckDone: true })).toBeNull();
  });

  it("resolves not_found once every lookup has come back empty", () => {
    expect(
      resolveOutcome({
        ...pending,
        publicCheckDone: true,
        ownerPullDone: true,
      }),
    ).toBe("not_found");
  });
});

describe("useResolutionOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports the outcome once it resolves", () => {
    const { rerender } = renderHook(
      ({ outcome }) => useResolutionOutcome(outcome),
      { initialProps: { outcome: null as "shared" | null } },
    );

    expect(trackEvent).not.toHaveBeenCalled();

    rerender({ outcome: "shared" });

    expect(trackEvent).toHaveBeenCalledWith(
      "recipe_detail_resolved",
      expect.objectContaining({ outcome: "shared", was_stuck: false }),
    );
  });

  it("reports only the first resolution", () => {
    const { rerender } = renderHook(
      ({ outcome }) => useResolutionOutcome(outcome),
      { initialProps: { outcome: "shared" as "shared" | "local" } },
    );

    rerender({ outcome: "local" });

    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  it("reports being stuck when nothing resolves in time", () => {
    renderHook(() => useResolutionOutcome(null));

    vi.advanceTimersByTime(STUCK_AFTER_MS);

    expect(trackEvent).toHaveBeenCalledWith("recipe_detail_stuck", {
      after_ms: STUCK_AFTER_MS,
    });
  });

  it("does not report stuck when it resolved first", () => {
    const { rerender } = renderHook(
      ({ outcome }) => useResolutionOutcome(outcome),
      { initialProps: { outcome: null as "local" | null } },
    );
    rerender({ outcome: "local" });

    vi.advanceTimersByTime(STUCK_AFTER_MS);

    expect(trackEvent).not.toHaveBeenCalledWith(
      "recipe_detail_stuck",
      expect.anything(),
    );
  });

  it("marks a late resolution as having been stuck", () => {
    const { rerender } = renderHook(
      ({ outcome }) => useResolutionOutcome(outcome),
      { initialProps: { outcome: null as "shared" | null } },
    );

    vi.advanceTimersByTime(STUCK_AFTER_MS);
    rerender({ outcome: "shared" });

    expect(trackEvent).toHaveBeenCalledWith(
      "recipe_detail_resolved",
      expect.objectContaining({ outcome: "shared", was_stuck: true }),
    );
  });

  it("stops the timer when the view unmounts", () => {
    const { unmount } = renderHook(() => useResolutionOutcome(null));

    unmount();
    vi.advanceTimersByTime(STUCK_AFTER_MS);

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
