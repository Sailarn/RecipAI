/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSyncOnLogin } from "../use-sync-on-login";

// --- mocks ---

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
  },
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/db/db";

// --- helpers ---

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
  return {
    ok,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockClear();
  vi.stubGlobal("fetch", mockFetch);
  vi.mocked(authClient.useSession).mockReturnValue({ data: null } as any);
  vi.mocked(useLiveQuery).mockReturnValue([] as any);
  vi.mocked(db.recipes.bulkPut).mockResolvedValue([] as any);
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Default fetch: push returns synced=0, pull returns empty
function setupDefaultFetch(synced = 0, remoteRecipes: object[] = []) {
  mockFetch
    .mockResolvedValueOnce(makeJsonResponse({ synced })) // POST push
    .mockResolvedValueOnce(makeJsonResponse({ recipes: remoteRecipes })); // GET pull
}

// --- tests ---

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
    it("does not push when local recipes list is empty", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch.mockResolvedValueOnce(makeJsonResponse({ recipes: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      // Only the GET pull, no POST push
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

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

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

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("pulls remote recipes and stores them in Dexie with Date conversion", async () => {
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

      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({ recipes: [remoteRecipe] }),
      );

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(db.recipes.bulkPut).toHaveBeenCalled());

      const stored = vi.mocked(db.recipes.bulkPut).mock.calls[0][0];
      expect(stored[0].id).toBe("remote-1");
      expect(stored[0].createdAt).toBeInstanceOf(Date);
      expect(stored[0].updatedAt).toBeInstanceOf(Date);
      expect(stored[0].createdAt.toISOString()).toBe(
        "2024-01-01T00:00:00.000Z",
      );
    });

    it("does not call bulkPut when pull returns empty array", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch.mockResolvedValueOnce(makeJsonResponse({ recipes: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 10));
      expect(db.recipes.bulkPut).not.toHaveBeenCalled();
    });

    it("shows error toast and resets hasSynced on fetch failure", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([] as any);

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

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

      // First auto-sync
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ recipes: [] }));

      const { result } = renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      // Manual trigger
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ recipes: [] }));

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
