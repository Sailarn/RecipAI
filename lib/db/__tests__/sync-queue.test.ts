import { describe, expect, it, vi } from "vitest";
import { createSyncQueue } from "../sync-queue";

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

describe("createSyncQueue", () => {
  it("sends a request for an idle id synchronously", () => {
    const sendInOrder = createSyncQueue();
    const request = vi.fn().mockResolvedValue(undefined);

    sendInOrder("a", request);

    expect(request).toHaveBeenCalledOnce();
  });

  it("sends each id's requests one after another, in call order", async () => {
    const sendInOrder = createSyncQueue();
    const first = deferred();
    const second = deferred();
    const sent: string[] = [];

    sendInOrder("a", () => {
      sent.push("first");
      return first.promise;
    });
    sendInOrder("a", () => {
      sent.push("second");
      return second.promise;
    });
    sendInOrder("a", async () => {
      sent.push("third");
    });

    expect(sent).toEqual(["first"]);
    first.resolve();
    await vi.waitFor(() => expect(sent).toEqual(["first", "second"]));
    second.resolve();
    await vi.waitFor(() => expect(sent).toEqual(["first", "second", "third"]));
  });

  it("does not hold one id behind another", () => {
    const sendInOrder = createSyncQueue();
    const request = vi.fn().mockResolvedValue(undefined);

    sendInOrder("a", () => deferred().promise);
    sendInOrder("b", request);

    expect(request).toHaveBeenCalledOnce();
  });

  it("sends synchronously again once the queue has drained", async () => {
    const sendInOrder = createSyncQueue();
    const first = deferred();
    sendInOrder("a", () => first.promise);
    first.resolve();
    await first.promise;
    await Promise.resolve();
    const request = vi.fn().mockResolvedValue(undefined);

    sendInOrder("a", request);

    expect(request).toHaveBeenCalledOnce();
  });
});
