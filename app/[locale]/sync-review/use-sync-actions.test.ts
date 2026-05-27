/**
 * @vitest-environment happy-dom
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncNotification } from "@/lib/db/schema";

vi.mock("@/lib/db/notifications", () => ({
  resolveNotification: vi.fn().mockResolvedValue(undefined),
  clearSyncNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    recipes: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    collections: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { toast } from "sonner";
import { db } from "@/lib/db/db";
import {
  clearSyncNotifications,
  resolveNotification,
} from "@/lib/db/notifications";
import { useNavigate } from "@/lib/transitions";
import { useSyncActions } from "./use-sync-actions";

const mockFetch = vi.fn();

const serverOnlyRecipe: SyncNotification = {
  id: "n-srv-1",
  entityId: "recipe-srv-1",
  entityType: "recipe",
  type: "server_only",
  serverSnapshot: JSON.stringify({
    id: "recipe-srv-1",
    title: "Server Recipe",
    servings: 2,
    ingredients: [],
    instructions: [],
    createdAt: "2024-01-03T00:00:00.000Z",
    updatedAt: "2024-01-03T00:00:00.000Z",
  }),
  localSnapshot: null,
  createdAt: new Date("2024-01-03"),
};

const serverOnlyCollection: SyncNotification = {
  id: "n-srv-col-1",
  entityId: "col-srv-1",
  entityType: "collection",
  type: "server_only",
  serverSnapshot: JSON.stringify({
    id: "col-srv-1",
    name: "Server Collection",
    emoji: "📚",
    createdAt: "2024-01-03T00:00:00.000Z",
    updatedAt: "2024-01-03T00:00:00.000Z",
  }),
  localSnapshot: null,
  createdAt: new Date("2024-01-03"),
};

const localOnlyCollection: SyncNotification = {
  id: "n-loc-1",
  entityId: "col-loc-1",
  entityType: "collection",
  type: "local_only",
  serverSnapshot: null,
  localSnapshot: JSON.stringify({
    id: "col-loc-1",
    name: "My Collection",
    emoji: "⭐",
    createdAt: "2024-01-05T00:00:00.000Z",
    updatedAt: "2024-01-05T00:00:00.000Z",
  }),
  createdAt: new Date("2024-01-05"),
};

const conflictedRecipe: SyncNotification = {
  id: "n-con-1",
  entityId: "recipe-con-1",
  entityType: "recipe",
  type: "conflicted",
  serverSnapshot: JSON.stringify({
    id: "recipe-con-1",
    title: "Shared Recipe (server)",
    servings: 4,
    ingredients: [],
    instructions: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-04T00:00:00.000Z",
  }),
  localSnapshot: JSON.stringify({
    id: "recipe-con-1",
    title: "Shared Recipe (local)",
    servings: 2,
    ingredients: [],
    instructions: [],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  }),
  createdAt: new Date("2024-01-04"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderActions() {
  const { result } = renderHook(() => useSyncActions("en"));
  return result.current;
}

describe("useSyncActions", () => {
  describe("addToDevice", () => {
    it("writes recipe snapshot to Dexie with Date objects and resolves notification", async () => {
      const actions = renderActions();

      await actions.addToDevice(serverOnlyRecipe);

      expect(db.recipes.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "recipe-srv-1",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-srv-1");
    });

    it("writes collection snapshot to Dexie with Date objects and resolves notification", async () => {
      const actions = renderActions();

      await actions.addToDevice(serverOnlyCollection);

      expect(db.collections.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "col-srv-1",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-srv-col-1");
    });

    it("does nothing when serverSnapshot is null", async () => {
      const actions = renderActions();
      const notif: SyncNotification = {
        ...serverOnlyRecipe,
        serverSnapshot: null,
      };

      await actions.addToDevice(notif);

      expect(db.recipes.put).not.toHaveBeenCalled();
      expect(resolveNotification).not.toHaveBeenCalled();
    });
  });

  describe("deleteFromServer", () => {
    it("calls DELETE API for recipe and resolves notification", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const actions = renderActions();

      await actions.deleteFromServer(serverOnlyRecipe);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recipes/recipe-srv-1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-srv-1");
    });

    it("calls DELETE API for collection and resolves notification", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const actions = renderActions();

      await actions.deleteFromServer(serverOnlyCollection);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/col-srv-1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-srv-col-1");
    });

    it("shows error toast and does not resolve on API failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const actions = renderActions();

      await actions.deleteFromServer(serverOnlyRecipe);

      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("uploadToServer", () => {
    it("calls collections sync API and resolves", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const actions = renderActions();

      await actions.uploadToServer(localOnlyCollection);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/sync",
        expect.objectContaining({ method: "POST" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-loc-1");
    });

    it("shows error toast and does not resolve on API failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const actions = renderActions();

      await actions.uploadToServer(localOnlyCollection);

      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it("does nothing when localSnapshot is null", async () => {
      const actions = renderActions();
      const notif: SyncNotification = {
        ...localOnlyCollection,
        localSnapshot: null,
      };

      await actions.uploadToServer(notif);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("deleteFromDevice", () => {
    it("calls db.collections.delete and resolves", async () => {
      const actions = renderActions();

      await actions.deleteFromDevice(localOnlyCollection);

      expect(db.collections.delete).toHaveBeenCalledWith("col-loc-1");
      expect(resolveNotification).toHaveBeenCalledWith("n-loc-1");
    });
  });

  describe("keepMine", () => {
    it("PATCHes recipe endpoint with full local snapshot", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const actions = renderActions();

      await actions.keepMine(conflictedRecipe);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recipes/recipe-con-1",
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-con-1");
    });

    it("shows error toast and does not resolve on PATCH failure", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const actions = renderActions();

      await actions.keepMine(conflictedRecipe);

      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("addAll", () => {
    it("resolves all notifications and shows success toast", async () => {
      const second: SyncNotification = {
        ...serverOnlyRecipe,
        id: "n-srv-2",
        entityId: "recipe-srv-2",
        serverSnapshot: JSON.stringify({
          id: "recipe-srv-2",
          title: "Another Server Recipe",
          servings: 1,
          ingredients: [],
          instructions: [],
          createdAt: "2024-01-03T00:00:00.000Z",
          updatedAt: "2024-01-03T00:00:00.000Z",
        }),
      };
      const actions = renderActions();

      await actions.addAll([serverOnlyRecipe, second]);

      expect(resolveNotification).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith("2 items added to device");
    });

    it("uses singular form for 1 item", async () => {
      const actions = renderActions();

      await actions.addAll([serverOnlyRecipe]);

      expect(toast.success).toHaveBeenCalledWith("1 item added to device");
    });
  });

  describe("uploadAll", () => {
    it("resolves successful items and shows success toast", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const actions = renderActions();

      await actions.uploadAll([localOnlyCollection]);

      expect(toast.success).toHaveBeenCalledWith("1 item uploaded");
    });

    it("shows error toast when some items fail", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const actions = renderActions();

      await actions.uploadAll([localOnlyCollection]);

      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("1 item failed to upload");
    });
  });

  describe("dismissAll", () => {
    it("clears notifications, shows toast, and navigates to profile", async () => {
      const mockReplace = vi.fn();
      vi.mocked(useNavigate).mockReturnValue({
        push: vi.fn(),
        back: vi.fn(),
        reset: vi.fn(),
        replace: mockReplace,
      });
      const actions = renderActions();

      await actions.dismissAll();

      expect(clearSyncNotifications).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Sync review cleared");
      expect(mockReplace).toHaveBeenCalledWith("/en/profile");
    });
  });
});
