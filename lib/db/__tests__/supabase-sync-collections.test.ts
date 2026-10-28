import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session-state", () => ({
  isSignedIn: vi.fn().mockReturnValue(true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import type { Collection } from "../schema";
import {
  syncCreateCollection,
  syncDeleteCollection,
  syncUpdateCollection,
} from "../supabase-sync-collections";

const mockFetch = vi.fn();

const COLLECTION = {
  id: "col-1",
  name: "Soups",
  emoji: "🍲",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
} as Collection;

function deferredResponse() {
  let resolve: (value: Response) => void = () => {};
  const promise = new Promise<Response>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

function methods() {
  return mockFetch.mock.calls.map(([, init]) => init?.method);
}

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response());
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(async () => {
  // Drain in-flight create barriers so they don't leak into the next test.
  await new Promise((resolve) => setTimeout(resolve, 0));
  vi.unstubAllGlobals();
});

describe("syncCreateCollection", () => {
  it("posts only the id, name and emoji", () => {
    syncCreateCollection({ ...COLLECTION, userId: "user-1" });

    expect(mockFetch).toHaveBeenCalledWith("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Soups", emoji: "🍲", id: "col-1" }),
    });
  });
});

describe("syncUpdateCollection", () => {
  it("patches the collection with the new name and emoji", () => {
    syncUpdateCollection("col-1", { name: "Stews", emoji: "🥘" });

    expect(mockFetch).toHaveBeenCalledWith("/api/collections/col-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Stews", emoji: "🥘" }),
    });
  });
});

describe("syncDeleteCollection", () => {
  it("deletes the collection", () => {
    syncDeleteCollection("col-1");

    expect(mockFetch).toHaveBeenCalledWith("/api/collections/col-1", {
      method: "DELETE",
    });
  });
});

describe("create barrier", () => {
  it.each([
    ["PATCH", () => syncUpdateCollection("col-1", { name: "X", emoji: "⭐" })],
    ["DELETE", () => syncDeleteCollection("col-1")],
  ])("holds a %s until the collection's create lands", async (method, send) => {
    const create = deferredResponse();
    mockFetch.mockReturnValueOnce(create.promise);

    syncCreateCollection(COLLECTION);
    send();

    expect(methods()).toEqual(["POST"]);

    create.resolve(new Response());

    await vi.waitFor(() => expect(methods()).toEqual(["POST", method]));
  });

  it("does not hold requests for another collection", () => {
    mockFetch.mockReturnValueOnce(deferredResponse().promise);

    syncCreateCollection(COLLECTION);
    syncDeleteCollection("col-2");

    expect(methods()).toEqual(["POST", "DELETE"]);
  });
});
