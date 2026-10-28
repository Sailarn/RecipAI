/**
 * Sends each entity's sync requests in the order they were made.
 *
 * Sync requests are fire-and-forget, so two writes to the same row can reach
 * the server out of order. An edit right after a create then hit a row that
 * didn't exist yet and was dropped (a recipe's updatedAt drifted and raised a
 * false "server has a newer version" prompt). A delete could be overtaken by
 * its create and the row came back. Two quick pantry toggles could land
 * reversed. Requests for different ids still go out in parallel, and a
 * request for an idle id is sent synchronously.
 */
export function createSyncQueue() {
  const inFlight = new Map<string, Promise<void>>();

  return function send(id: string, request: () => Promise<void>): void {
    const previous = inFlight.get(id);
    const current = previous ? previous.then(request) : request();
    inFlight.set(id, current);
    current.finally(() => {
      if (inFlight.get(id) === current) inFlight.delete(id);
    });
  };
}
