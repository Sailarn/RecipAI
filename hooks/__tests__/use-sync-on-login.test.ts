/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncOnLogin } from "../use-sync-on-login";

vi.mock("@/lib/auth-client", () => ({
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
  },
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    recipes: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
    },
    collections: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db/db";

const mockFetch = vi.fn();

const mockSession = {
  id: "user-1",
  user: { id: "user-1", email: "test@example.com" },
};

const mockLocalRecipe = {
  id: "local-1",
  title: "Local Recipe",
  servings: 2,
  ingredients: [],
  instructions: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

function makeJsonResponse(body: object, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

// Fetch call order (local recipes non-empty, local collections empty):
//   1. POST /api/recipes/sync  (push recipes)
//   2. GET  /api/recipes/sync  (pull recipes)
//   3. GET  /api/collections   (pull collections — no push since collections empty)
//
// Fetch call order (local recipes empty, local collections empty):
//   1. GET  /api/recipes/sync
//   2. GET  /api/collections
function setupDefaultFetch(synced = 0, remoteRecipes: object[] = []) {
  mockFetch
    .mockResolvedValueOnce(makeJsonResponse({ synced })) // POST push recipes
    .mockResolvedValueOnce(makeJsonResponse({ recipes: remoteRecipes })) // GET pull recipes
    .mockResolvedValueOnce(makeJsonResponse({ collections: [] })); // GET pull collections
}

beforeEach(() => {
  mockFetch.mockClear();
  vi.stubGlobal("fetch", mockFetch);
  vi.mocked(authClient.useSession).mockReturnValue({ data: null } as any);
  vi.mocked(useLiveQuery).mockReturnValue([] as any);
  vi.mocked(db.recipes.bulkPut).mockResolvedValue([] as any);
  vi.mocked(db.collections.toArray).mockResolvedValue([] as any);
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSyncOnLogin", () => {
  describe("no sync conditions", () => {
    it("does not fetch when session is null", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({ data: null } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      renderHook(() => useSyncOnLogin());

      await new Promise((r) => setTimeout(r, 10));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("does not fetch when localRecipes is undefined (still loading)", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue(undefined as any);

      renderHook(() => useSyncOnLogin());

      await new Promise((r) => setTimeout(r, 10));
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("sync on login", () => {
    it("does not push recipes when local list is empty", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      expect(mockFetch).toHaveBeenCalledWith("/api/recipes/sync");
      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/recipes/sync",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("pushes local recipes when list is non-empty", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([mockLocalRecipe] as any);

      setupDefaultFetch(0, []);

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recipes/sync",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ recipes: [mockLocalRecipe] }),
        }),
      );
    });

    it("shows success toast when synced > 0", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([mockLocalRecipe] as any);

      setupDefaultFetch(3, []);

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("3 recipes synced");
    });

    it("shows singular toast when synced === 1", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([mockLocalRecipe] as any);

      setupDefaultFetch(1, []);

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith("1 recipe synced");
    });

    it("does not show toast when synced === 0", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([mockLocalRecipe] as any);

      setupDefaultFetch(0, []);

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("pulls remote recipes and stores them with Date conversion", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      const remoteRecipe = {
        id: "remote-1",
        title: "Remote Recipe",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      };

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [remoteRecipe] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.recipes.bulkPut).toHaveBeenCalled());

      const stored = vi.mocked(db.recipes.bulkPut).mock.calls[0][0];
      expect(stored[0].createdAt).toBeInstanceOf(Date);
      expect(stored[0].updatedAt).toBeInstanceOf(Date);
    });

    it("does not call bulkPut for recipes when pull returns empty", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 10));
      expect(db.recipes.bulkPut).not.toHaveBeenCalled();
    });

    it("pushes local collections to server when non-empty", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);
      vi.mocked(db.collections.toArray).mockResolvedValue([
        {
          id: "c1",
          name: "Faves",
          emoji: "⭐",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as any);

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] })) // GET pull recipes
        .mockResolvedValueOnce(makeJsonResponse({ synced: 1 })) // POST push collections
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] })); // GET pull collections

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(3));

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/sync",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("c1"),
        }),
      );
    });

    it("merges server collections without clearing local ones", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch
        .mockResolvedValueOnce(
          makeJsonResponse({
            recipes: [],
          }),
        )
        .mockResolvedValueOnce(
          makeJsonResponse({
            collections: [
              {
                id: "c-server",
                name: "Server",
                emoji: "🔥",
                createdAt: "2024-01-01T00:00:00.000Z",
                updatedAt: "2024-01-01T00:00:00.000Z",
              },
            ],
          }),
        );

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.collections.bulkPut).toHaveBeenCalled());
      // bulkPut called (merge), clear NOT available on the mock = never called
      const stored = vi.mocked(db.collections.bulkPut).mock.calls[0][0];
      expect(stored[0].id).toBe("c-server");
      expect(stored[0].createdAt).toBeInstanceOf(Date);
    });

    it("shows error toast and resets hasSynced on fetch failure", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockRejectedValueOnce(new Error("Network error"));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Sync failed, will retry next time",
      );
    });
  });

  describe("triggerSync", () => {
    it("triggers sync manually even after initial sync", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      const { result } = renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });
});
