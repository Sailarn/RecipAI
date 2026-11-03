/**
 * @vitest-environment happy-dom
 */

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const useSyncStatus = vi.hoisted(() => vi.fn());
vi.mock("@/lib/sync-context", () => ({ useSyncStatus }));
// Exit animations never finish under fake timers; render plain elements.
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

import {
  NEW_RECIPES_MESSAGE_MS,
  SYNC_MESSAGE_DELAY_MS,
  SyncStatusPill,
} from "../index";

function status(syncing: boolean, newRecipes = 0, finishedAt = 0) {
  useSyncStatus.mockReturnValue({ syncing, newRecipes, finishedAt });
}

describe("SyncStatusPill", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("says nothing while idle", () => {
    status(false);
    render(<SyncStatusPill />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows the updating message once a sync runs past the delay", () => {
    status(true);
    render(<SyncStatusPill />);
    expect(screen.queryByText("syncing")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SYNC_MESSAGE_DELAY_MS));
    expect(screen.getByText("syncing")).toBeInTheDocument();
  });

  it("stays quiet for a sync that finishes quickly", () => {
    status(true);
    const { rerender } = render(<SyncStatusPill />);
    act(() => vi.advanceTimersByTime(SYNC_MESSAGE_DELAY_MS - 50));
    status(false, 0, Date.now());
    rerender(<SyncStatusPill />);
    act(() => vi.advanceTimersByTime(SYNC_MESSAGE_DELAY_MS));

    expect(screen.queryByText("syncing")).not.toBeInTheDocument();
  });

  it("leaves the running message to the pull-to-refresh indicator", () => {
    status(true);
    render(<SyncStatusPill suppressSyncing />);
    act(() => vi.advanceTimersByTime(SYNC_MESSAGE_DELAY_MS));
    expect(screen.queryByText("syncing")).not.toBeInTheDocument();
  });

  it("announces new recipes for a few seconds after a sync", () => {
    status(false, 2, 1000);
    render(<SyncStatusPill />);
    expect(screen.getByText("syncNewRecipes")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(NEW_RECIPES_MESSAGE_MS));
    expect(screen.queryByText("syncNewRecipes")).not.toBeInTheDocument();
  });
});
