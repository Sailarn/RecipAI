interface SyncItem {
  id: string;
  updatedAt: Date;
}

export interface SyncDiff<T extends SyncItem> {
  serverOnly: T[];
  localOnly: T[];
  conflicted: Array<{ local: T; server: T }>;
  identical: T[];
}

export function computeDiff<T extends SyncItem>(
  local: T[],
  server: T[],
): SyncDiff<T> {
  const localMap = new Map<string, T>(local.map((item) => [item.id, item]));
  const serverMap = new Map<string, T>(server.map((item) => [item.id, item]));

  const serverOnly: T[] = [];
  const conflicted: Array<{ local: T; server: T }> = [];
  const identical: T[] = [];

  for (const [id, serverItem] of serverMap) {
    const localItem = localMap.get(id);
    if (!localItem) {
      serverOnly.push(serverItem);
    } else if (serverItem.updatedAt.getTime() === localItem.updatedAt.getTime()) {
      identical.push(localItem);
    } else {
      conflicted.push({ local: localItem, server: serverItem });
    }
  }

  const localOnly: T[] = [];
  for (const [id, localItem] of localMap) {
    if (!serverMap.has(id)) {
      localOnly.push(localItem);
    }
  }

  return { serverOnly, localOnly, conflicted, identical };
}
