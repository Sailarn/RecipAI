import { computeDiff, type SyncItem } from "./sync-diff";

/** A local or server record the reconciler can plan over. */
export interface ReconcileItem extends SyncItem {
  /** Device-local marker; present once the item has round-tripped the server. */
  syncedAt?: Date | null;
}

export interface ReconcilePlan<T> {
  /** Server copies to write to the device (server wins). */
  applyFromServer: T[];
  /** Never-synced device-only items to upload as new server rows. */
  pushToServer: T[];
  /** Ids of previously-synced device-only items the server has deleted. */
  deleteLocalIds: string[];
}

interface ReconcileOptions {
  now: number;
  /** A local edit newer than this (its PATCH may still be in flight) is left untouched. */
  graceWindowMs: number;
}

/**
 * Plan a server-wins reconciliation between the device and the server.
 *
 * - Present on both, differing: server replaces the device copy.
 * - Present on both, identical but unmarked: apply the server copy once to set
 *   the `syncedAt` marker (a legacy row from before markers existed).
 * - Server-only: pull to the device.
 * - Device-only, previously synced: the server deleted it — delete locally.
 * - Device-only, never synced: a genuinely new local item — push to the server.
 *
 * A local item edited within `graceWindowMs` is skipped so a still-in-flight
 * local write is not overwritten by the server's pre-edit snapshot.
 */
export function planReconcile<T extends ReconcileItem>(
  local: T[],
  server: T[],
  options: ReconcileOptions,
): ReconcilePlan<T> {
  const { serverOnly, localOnly, conflicted, identical } = computeDiff(
    local,
    server,
  );
  const serverById = new Map<string, T>(server.map((item) => [item.id, item]));

  const applyFromServer: T[] = [
    ...serverOnly,
    ...conflicted
      .filter(
        ({ local: localItem }) =>
          options.now - localItem.updatedAt.getTime() >= options.graceWindowMs,
      )
      .map(({ server: serverItem }) => serverItem),
    ...identical.flatMap((localItem) => {
      if (localItem.syncedAt) return [];
      const serverItem = serverById.get(localItem.id);
      return serverItem ? [serverItem] : [];
    }),
  ];

  const pushToServer = localOnly.filter((item) => !item.syncedAt);
  const deleteLocalIds = localOnly
    .filter((item) => item.syncedAt)
    .map((item) => item.id);

  return { applyFromServer, pushToServer, deleteLocalIds };
}
