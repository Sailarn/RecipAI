"use client";

import { useSyncExternalStore } from "react";

/**
 * What the UI shows about background syncs: whether one is running, and how
 * many recipes the last finished one brought in that this device didn't have.
 *
 * Kept in a tiny external store rather than React state in useSyncOnLogin:
 * re-rendering that hook on every status change would re-run its effects, and
 * after a failed sync (which re-arms the initial sync) that can turn into a
 * retry loop. Only the components that show the status subscribe to it.
 */
export interface SyncStatus {
  syncing: boolean;
  newRecipes: number;
  /** When the last sync finished (ms); 0 before the first. */
  finishedAt: number;
}

export const IDLE_SYNC_STATUS: SyncStatus = {
  syncing: false,
  newRecipes: 0,
  finishedAt: 0,
};

let status: SyncStatus = IDLE_SYNC_STATUS;
const listeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function setSyncStatus(next: SyncStatus): void {
  status = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: back to idle. */
export function resetSyncStatus(): void {
  setSyncStatus(IDLE_SYNC_STATUS);
}

export function useSyncStatusStore(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus, getSyncStatus);
}
