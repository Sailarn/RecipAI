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
    recipes: { toArray: vi.fn().mockResolvedValue([]) },
    collections: { toArray: vi.fn().mockResolvedValue([]) },
    ingredients: {
      filter: vi
        .fn()
        .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      bulkPut: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/lib/db/notifications", () => ({
  replaceSyncNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/pantry", () => ({
  clearPantry: vi.fn().mockResolvedValue(undefined),
  bulkPutPantry: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { authClient } from "@/lib/auth/auth-client";
import { db } from "@/lib/db/db";
import { replaceSyncNotifications } from "@/lib/db/notifications";
import { useSyncOnLogin } from "../use-sync-on-login";

const mockFetch = vi.fn();

const mockSession = {
  id: "user-1",
  user: { id: "user-1", email: "test@example.com" },
};

function makeJsonResponse(body: object, ok = true) {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

function setupFetch({
  recipes = [] as unknown[],
  collections = [] as unknown[],
  rejectSync = false,
} = {}) {
  mockFetch.mockImplementation((url: string) => {
    if (String(url).startsWith("/api/ingredients")) {
      return Promise.resolve(
        makeJsonResponse({ ingredients: [], serverMaxUpdatedAt: "" }),
      );
    }
    if (String(url) === "/api/pantry") {
      return Promise.resolve(makeJsonResponse({ items: [] }));
    }
    if (rejectSync) return Promise.reject(new Error("Network error"));
    if (String(url) === "/api/recipes/sync") {
      return Promise.resolve(makeJsonResponse({ recipes }));
    }
    return Promise.resolve(makeJsonResponse({ collections }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
  vi.mocked(authClient.useSession).mockReturnValue({ data: null } as any);
  vi.mocked(useLiveQuery).mockReturnValue([] as any);
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
      await new Promise((r) => setTimeout(r, 10));
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("diff-based sync flow", () => {
    it("fetches server recipes and server collections on login", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
      expect(mockFetch).toHaveBeenCalledWith("/api/ingredients");
      expect(mockFetch).toHaveBeenCalledWith("/api/pantry");
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes/sync");
      expect(mockFetch).toHaveBeenCalledWith("/api/collections");
    });

    it("calls replaceSyncNotifications with empty array when no mismatches", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      expect(replaceSyncNotifications).toHaveBeenCalledWith([]);
    });

    it("writes server_only notification when server has recipe local does not", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([]);
      setupFetch({
        recipes: [
          {
            id: "srv-1",
            title: "Server Recipe",
            servings: 2,
            ingredients: [],
            instructions: [],
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      const notifications = vi.mocked(replaceSyncNotifications).mock
        .calls[0][0];
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("server_only");
      expect(notifications[0].entityType).toBe("recipe");
      expect(notifications[0].entityId).toBe("srv-1");
      expect(notifications[0].serverSnapshot).toContain("srv-1");
      expect(notifications[0].localSnapshot).toBeNull();
    });

    it("writes local_only notification when device has recipe server does not", async () => {
      const localRecipe = {
        id: "local-1",
        title: "Local Recipe",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([localRecipe] as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([localRecipe] as any);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      const notifications = vi.mocked(replaceSyncNotifications).mock
        .calls[0][0];
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("local_only");
      expect(notifications[0].entityId).toBe("local-1");
      expect(notifications[0].localSnapshot).toContain("local-1");
      expect(notifications[0].serverSnapshot).toBeNull();
    });

    it("writes conflicted notification when updatedAt differs", async () => {
      const localRecipe = {
        id: "shared-1",
        title: "Shared Recipe",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([localRecipe] as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([localRecipe] as any);
      setupFetch({
        recipes: [
          {
            ...localRecipe,
            updatedAt: "2024-01-02T00:00:00.000Z",
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      const notifications = vi.mocked(replaceSyncNotifications).mock
        .calls[0][0];
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("conflicted");
      expect(notifications[0].serverSnapshot).toContain("shared-1");
      expect(notifications[0].localSnapshot).toContain("shared-1");
    });

    it("suppresses conflicted notification for a recipe written within the grace window", async () => {
      const recentUpdatedAt = new Date(Date.now() - 10_000);
      const localRecipe = {
        id: "recent-1",
        title: "Fresh Recipe",
        servings: 1,
        ingredients: [],
        instructions: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: recentUpdatedAt,
      };
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([localRecipe] as any);
      setupFetch({
        recipes: [
          {
            ...localRecipe,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-02T00:00:00.000Z",
          },
        ],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      expect(vi.mocked(replaceSyncNotifications).mock.calls[0][0]).toHaveLength(
        0,
      );
      expect(toast.info).not.toHaveBeenCalled();
    });

    it("still emits conflicted notification for a recipe whose local write is outside the grace window", async () => {
      const oldDate = new Date("2024-01-01");
      const localRecipe = {
        id: "old-1",
        title: "Old Recipe",
        servings: 1,
        ingredients: [],
        instructions: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: oldDate,
      };
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([localRecipe] as any);
      setupFetch({
        recipes: [
          {
            ...localRecipe,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-02T00:00:00.000Z",
          },
        ],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      const notifications = vi.mocked(replaceSyncNotifications).mock
        .calls[0][0];
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("conflicted");
    });

    it("does not write notification for identical items (same updatedAt)", async () => {
      const recipe = {
        id: "same-1",
        title: "Same",
        servings: 2,
        ingredients: [],
        instructions: [],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(useLiveQuery).mockReturnValue([recipe] as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([recipe] as any);
      setupFetch({
        recipes: [
          {
            ...recipe,
            createdAt: recipe.createdAt.toISOString(),
            updatedAt: recipe.updatedAt.toISOString(),
          },
        ],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      expect(vi.mocked(replaceSyncNotifications).mock.calls[0][0]).toHaveLength(
        0,
      );
    });

    it("shows toast.info with singular wording when 1 notification", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch({
        recipes: [
          {
            id: "srv-1",
            title: "T",
            servings: 1,
            ingredients: [],
            instructions: [],
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.info).toHaveBeenCalled());
      expect(toast.info).toHaveBeenCalledWith(
        "1 item needs your review",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Review" }),
        }),
      );
    });

    it("shows toast.info with plural wording when multiple notifications", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      const makeRecipe = (id: string) => ({
        id,
        title: `Recipe ${id}`,
        servings: 1,
        ingredients: [],
        instructions: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });
      setupFetch({ recipes: [makeRecipe("a"), makeRecipe("b")] });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.info).toHaveBeenCalled());
      expect(toast.info).toHaveBeenCalledWith(
        "2 items need your review",
        expect.anything(),
      );
    });

    it("does not show any toast when there are no mismatches", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch();

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      expect(toast.info).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("shows error toast and does not call replaceSyncNotifications on fetch failure", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch({ rejectSync: true });

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Sync failed — check your connection",
      );
      expect(replaceSyncNotifications).not.toHaveBeenCalled();
    });
  });

  describe("re-pull on focus", () => {
    const serverRecipe = {
      id: "srv-1",
      title: "Bot Recipe",
      servings: 1,
      ingredients: [],
      instructions: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };

    it("re-pulls server state when the document becomes visible again", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch();
      renderHook(() => useSyncOnLogin());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

      document.dispatchEvent(new Event("visibilitychange"));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(8));
    });

    it("does not re-toast the same review items on a visibility re-pull", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch({ recipes: [serverRecipe] });
      renderHook(() => useSyncOnLogin());
      await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));

      document.dispatchEvent(new Event("visibilitychange"));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(8));
      expect(toast.info).toHaveBeenCalledTimes(1);
    });
  });

  describe("triggerSync", () => {
    it("re-runs sync when called manually after initial sync", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      setupFetch();

      const { result } = renderHook(() => useSyncOnLogin());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));

      await result.current.triggerSync();
      expect(mockFetch).toHaveBeenCalledTimes(8);
    });
  });
});
