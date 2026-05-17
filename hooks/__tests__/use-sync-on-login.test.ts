/**
 * @vitest-environment happy-dom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    info: vi.fn(),
  },
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    recipes: { toArray: vi.fn().mockResolvedValue([]) },
    collections: { toArray: vi.fn().mockResolvedValue([]) },
  },
}));

vi.mock("@/lib/db/notifications", () => ({
  replaceSyncNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() }),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
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
      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(mockFetch).toHaveBeenCalledWith("/api/recipes/sync");
      expect(mockFetch).toHaveBeenCalledWith("/api/collections");
    });

    it("calls replaceSyncNotifications with empty array when no mismatches", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      expect(replaceSyncNotifications).toHaveBeenCalledWith([]);
    });

    it("writes server_only notification when server has recipe local does not", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      vi.mocked(db.recipes.toArray).mockResolvedValue([]);
      mockFetch
        .mockResolvedValueOnce(
          makeJsonResponse({
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
          }),
        )
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

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
      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

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
      mockFetch
        .mockResolvedValueOnce(
          makeJsonResponse({
            recipes: [
              {
                ...localRecipe,
                updatedAt: "2024-01-02T00:00:00.000Z",
                createdAt: "2024-01-01T00:00:00.000Z",
              },
            ],
          }),
        )
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      const notifications = vi.mocked(replaceSyncNotifications).mock
        .calls[0][0];
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe("conflicted");
      expect(notifications[0].serverSnapshot).toContain("shared-1");
      expect(notifications[0].localSnapshot).toContain("shared-1");
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
      mockFetch
        .mockResolvedValueOnce(
          makeJsonResponse({
            recipes: [
              {
                ...recipe,
                createdAt: recipe.createdAt.toISOString(),
                updatedAt: recipe.updatedAt.toISOString(),
              },
            ],
          }),
        )
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

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
      mockFetch
        .mockResolvedValueOnce(
          makeJsonResponse({
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
          }),
        )
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

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
      mockFetch
        .mockResolvedValueOnce(
          makeJsonResponse({ recipes: [makeRecipe("a"), makeRecipe("b")] }),
        )
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

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
      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(replaceSyncNotifications).toHaveBeenCalled());
      expect(toast.info).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("shows error toast and does not call replaceSyncNotifications on fetch failure", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      renderHook(() => useSyncOnLogin());

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Sync failed — check your connection",
      );
      expect(replaceSyncNotifications).not.toHaveBeenCalled();
    });
  });

  describe("triggerSync", () => {
    it("re-runs sync when called manually after initial sync", async () => {
      vi.mocked(authClient.useSession).mockReturnValue({
        data: mockSession,
      } as any);
      mockFetch
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ recipes: [] }))
        .mockResolvedValueOnce(makeJsonResponse({ collections: [] }));

      const { result } = renderHook(() => useSyncOnLogin());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

      await result.current.triggerSync();
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });
});
