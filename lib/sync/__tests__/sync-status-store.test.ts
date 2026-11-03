/**
 * @vitest-environment happy-dom
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getSyncStatus,
  IDLE_SYNC_STATUS,
  resetSyncStatus,
  setSyncStatus,
  useSyncStatusStore,
} from "../sync-status-store";

describe("sync status store", () => {
  beforeEach(() => resetSyncStatus());

  it("starts idle", () => {
    expect(getSyncStatus()).toEqual(IDLE_SYNC_STATUS);
  });

  it("re-renders subscribers on change", () => {
    const { result } = renderHook(() => useSyncStatusStore());
    expect(result.current.syncing).toBe(false);

    act(() => setSyncStatus({ syncing: true, newRecipes: 0, finishedAt: 0 }));
    expect(result.current.syncing).toBe(true);

    act(() => setSyncStatus({ syncing: false, newRecipes: 3, finishedAt: 5 }));
    expect(result.current).toEqual({
      syncing: false,
      newRecipes: 3,
      finishedAt: 5,
    });
  });
});
