/**
 * @vitest-environment happy-dom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({ data: null }),
  },
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn().mockReturnValue([]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    recipes: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(1),
    },
    collections: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      bulkDelete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(1),
    },
    ingredients: {
      filter: vi
        .fn()
        .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      bulkPut: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/lib/db/notifications", () => ({
  clearSyncNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/pantry", () => ({
  clearPantry: vi.fn().mockResolvedValue(undefined),
  bulkPutPantry: vi.fn().mockResolvedValue(undefined),
}));

import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { db } from "@/lib/db/db";
import { clearSyncNotifications } from "@/lib/db/notifications";
import { useSyncOnLogin } from "../use-sync-on-login";

const mockFetch = vi.fn();

const mockSession = {
  id: "user-1",
  user: { id: "user-1", email: "test@example.com" },
};

function makeJsonResponse(body: object, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

function maintenanceResponse() {
  return new Response(
    JSON.stringify({ error: "Maintenance window", code: "MAINTENANCE_MODE" }),
    { status: 503 },
  );
}

function setupFetch({
  recipes = [] as unknown[],
  collections = [] as unknown[],
  rejectSync = false,
} = {}) {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const path = String(url);
    if (path.startsWith("/api/ingredients")) {
      return Promise.resolve(
        makeJsonResponse({ ingredients: [], serverMaxUpdatedAt: "" }),
      );
    }
    if (path === "/api/pantry") {
      return Promise.resolve(makeJsonResponse({ items: [] }));
    }
    // Both the recipe pull (GET) and the new-recipe push (POST) hit this path.
    if (path === "/api/recipes/sync") {
      if (options?.method === "POST")
        return Promise.resolve(makeJsonResponse({ synced: 1 }));
      if (rejectSync) return Promise.reject(new Error("Network error"));
      return Promise.resolve(makeJsonResponse({ recipes }));
    }
    if (path === "/api/collections/sync") {
      return Promise.resolve(makeJsonResponse({ synced: 1 }));
    }
    // /api/collections GET (the collections pull).
    if (rejectSync) return Promise.reject(new Error("Network error"));
    return Promise.resolve(makeJsonResponse({ collections }));
  });
}

const serverRecipe = (id: string, updatedAt = "2024-01-01T00:00:00.000Z") => ({
  id,
  title: `Recipe ${id}`,
  servings: 1,
  ingredients: [],
  instructions: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt,
});

const localRecipe = (id: string, updatedAt: Date, syncedAt?: Date) => ({
  id,
  title: `Recipe ${id}`,
  servings: 1,
  ingredients: [],
  instructions: [],
  createdAt: new Date("2024-01-01"),
  updatedAt,
  ...(syncedAt ? { syncedAt } : {}),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  vi.mocked(authClient.useSession).mockReturnValue({ data: null } as never);
  vi.mocked(db.recipes.toArray).mockResolvedValue([]);
  vi.mocked(db.collections.toArray).mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSyncOnLogin", () => {
  describe("no sync conditions", () => {
    it("does not fetch when session is null", async () => {
      renderHook(() => useSyncOnLogin());
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("reconciliation flow", () => {
    it("fetches server recipes and collections on login", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes/sync");
      expect(mockFetch).toHaveBeenCalledWith("/api/collections");
    });

    it("never shows a review toast", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch({ recipes: [serverRecipe("srv-1")] });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.recipes.bulkPut).toHaveBeenCalled());
      expect(toast.info).not.toHaveBeenCalled();
    });

    it("pulls a server-only recipe to the device with a synced marker", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch({ recipes: [serverRecipe("srv-1")] });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.recipes.bulkPut).toHaveBeenCalled());
      const written = vi.mocked(db.recipes.bulkPut).mock
        .calls[0][0] as unknown as Array<Record<string, unknown>>;
      expect(written).toHaveLength(1);
      expect(written[0].id).toBe("srv-1");
      expect(written[0].syncedAt).toBeInstanceOf(Date);
    });

    it("overwrites a device recipe with the server copy when they differ", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      vi.mocked(db.recipes.toArray).mockResolvedValue([
        localRecipe("shared", new Date("2024-01-01"), new Date("2024-01-01")),
      ] as never);
      setupFetch({
        recipes: [serverRecipe("shared", "2024-02-01T00:00:00.000Z")],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.recipes.bulkPut).toHaveBeenCalled());
      const written = vi.mocked(db.recipes.bulkPut).mock
        .calls[0][0] as unknown as Array<Record<string, unknown>>;
      expect(written[0].id).toBe("shared");
    });

    it("does not overwrite a local edit made within the grace window", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      vi.mocked(db.recipes.toArray).mockResolvedValue([
        localRecipe(
          "recent",
          new Date(Date.now() - 10_000),
          new Date("2024-01-01"),
        ),
      ] as never);
      setupFetch({
        recipes: [serverRecipe("recent", "2024-02-01T00:00:00.000Z")],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(clearSyncNotifications).toHaveBeenCalled());
      expect(db.recipes.bulkPut).not.toHaveBeenCalled();
      expect(db.recipes.bulkDelete).not.toHaveBeenCalled();
    });

    it("deletes a previously-synced device-only recipe (server removed it)", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      vi.mocked(db.recipes.toArray).mockResolvedValue([
        localRecipe("gone", new Date("2024-01-01"), new Date("2024-01-01")),
      ] as never);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.recipes.bulkDelete).toHaveBeenCalled());
      expect(vi.mocked(db.recipes.bulkDelete).mock.calls[0][0]).toEqual([
        "gone",
      ]);
    });

    it("pushes a never-synced device-only recipe and marks it synced", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      vi.mocked(db.recipes.toArray).mockResolvedValue([
        localRecipe("new-local", new Date("2024-01-01")),
      ] as never);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/recipes/sync",
          expect.objectContaining({ method: "POST" }),
        ),
      );
      await waitFor(() => expect(db.recipes.update).toHaveBeenCalled());
      expect(vi.mocked(db.recipes.update).mock.calls[0][0]).toBe("new-local");
      expect(db.recipes.bulkDelete).not.toHaveBeenCalled();
    });

    it("clears leftover review notifications on a successful sync", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(clearSyncNotifications).toHaveBeenCalled());
    });

    it("shows an error toast and writes nothing on fetch failure", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch({ rejectSync: true });

      renderHook(() => useSyncOnLogin());

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Sync failed — check your connection",
        ),
      );
      expect(db.recipes.bulkPut).not.toHaveBeenCalled();
      expect(clearSyncNotifications).not.toHaveBeenCalled();
    });

    it("stops quietly when the sync pull is blocked by maintenance", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      vi.mocked(db.recipes.toArray).mockResolvedValue([
        localRecipe("local-1", new Date("2024-01-01"), new Date("2024-01-01")),
      ] as never);
      mockFetch.mockImplementation((url: string) => {
        const path = String(url);
        if (path.startsWith("/api/ingredients")) {
          return Promise.resolve(
            makeJsonResponse({ ingredients: [], serverMaxUpdatedAt: "" }),
          );
        }
        if (path === "/api/pantry") {
          return Promise.resolve(makeJsonResponse({ items: [] }));
        }
        if (path === "/api/recipes/sync") {
          return Promise.resolve(maintenanceResponse());
        }
        return Promise.resolve(makeJsonResponse({ collections: [] }));
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/recipes/sync"),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(db.recipes.bulkDelete).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("re-pull on focus", () => {
    it("re-pulls server state when the document becomes visible again", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch();
      renderHook(() => useSyncOnLogin());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

      document.dispatchEvent(new Event("visibilitychange"));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(8));
    });
  });

  describe("triggerSync", () => {
    it("re-runs sync when called manually after initial sync", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);
      setupFetch();

      const { result } = renderHook(() => useSyncOnLogin());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

      await result.current.triggerSync();
      expect(mockFetch).toHaveBeenCalledTimes(8);
    });
  });

  describe("single-flight sync", () => {
    it("does not start a second sync while one is already in flight", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as never);

      let resolveRecipes: (value: Response) => void = () => {};
      const recipesPromise = new Promise<Response>((resolve) => {
        resolveRecipes = resolve;
      });
      mockFetch.mockImplementation((url: string) => {
        const path = String(url);
        if (path.startsWith("/api/ingredients")) {
          return Promise.resolve(
            makeJsonResponse({ ingredients: [], serverMaxUpdatedAt: "" }),
          );
        }
        if (path === "/api/pantry") {
          return Promise.resolve(makeJsonResponse({ items: [] }));
        }
        if (path === "/api/recipes/sync") return recipesPromise;
        return Promise.resolve(makeJsonResponse({ collections: [] }));
      });

      const { result } = renderHook(() => useSyncOnLogin());

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/recipes/sync"),
      );

      const manualCall = result.current.triggerSync();
      resolveRecipes(makeJsonResponse({ recipes: [] }));
      await manualCall;

      const recipesSyncCalls = mockFetch.mock.calls.filter(
        ([url]) => url === "/api/recipes/sync",
      );
      expect(recipesSyncCalls).toHaveLength(1);
    });
  });
});
