/**
 * Orders an entity's PATCH/DELETE after its own in-flight create POST.
 *
 * Sync requests are fire-and-forget, so a quick edit or delete right after a
 * create can reach the server first. The update then hits a row that doesn't
 * exist yet and is dropped, leaving the server stale (a recipe's updatedAt
 * drifted and raised a false "server has a newer version" prompt). A delete
 * is lost the same way and the create then resurrects the row.
 */
export function createBarrier() {
  const pendingCreates = new Map<string, Promise<void>>();

  return {
    trackCreate(id: string, done: Promise<void>): void {
      pendingCreates.set(id, done);
      done.finally(() => {
        if (pendingCreates.get(id) === done) pendingCreates.delete(id);
      });
    },
    afterCreate(id: string, send: () => void): void {
      const pending = pendingCreates.get(id);
      if (pending) pending.then(send);
      else send();
    },
  };
}
