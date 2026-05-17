/**
 * @vitest-environment happy-dom
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncNotification } from "@/lib/db/schema";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("@/lib/db/notifications", () => ({
  getAllNotifications: vi.fn().mockResolvedValue([]),
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
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() }),
}));

import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { db } from "@/lib/db/db";
import {
  clearSyncNotifications,
  resolveNotification,
} from "@/lib/db/notifications";
import SyncReviewPage from "../page";

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
  vi.mocked(useLiveQuery).mockReturnValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SyncReviewPage", () => {
  describe("empty state", () => {
    it("shows empty state when no notifications", () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);
      render(<SyncReviewPage />);
      expect(screen.getByText(/everything is in sync/i)).toBeInTheDocument();
    });
  });

  describe("server_only section", () => {
    it("renders NOT ON THIS DEVICE section with item title", () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe]);
      render(<SyncReviewPage />);
      expect(screen.getByText(/not on this device/i)).toBeInTheDocument();
      expect(screen.getByText("Server Recipe")).toBeInTheDocument();
    });

    it("Add to device writes recipe to Dexie with Date objects and resolves notification", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe]);
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add to device/i }));
      });
      expect(db.recipes.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "recipe-srv-1",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-srv-1");
    });

    it("Delete from server calls DELETE API and resolves notification", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyCollection]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /delete from server/i }),
        );
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/col-srv-1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-srv-col-1");
    });

    it("Delete from server shows error toast and does not resolve on failure", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyCollection]);
      mockFetch.mockResolvedValueOnce({ ok: false });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /delete from server/i }),
        );
      });
      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it("Add all resolves all server_only notifications and shows toast", async () => {
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
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe, second]);
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /add all/i }));
      });
      expect(resolveNotification).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledWith("2 items added to device");
    });
  });

  describe("local_only section", () => {
    it("renders NOT ON SERVER section with item name", () => {
      vi.mocked(useLiveQuery).mockReturnValue([localOnlyCollection]);
      render(<SyncReviewPage />);
      expect(screen.getByText(/not on server/i)).toBeInTheDocument();
      expect(screen.getByText(/my collection/i)).toBeInTheDocument();
    });

    it("Upload to server calls collections sync API and resolves", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([localOnlyCollection]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ synced: 1 }),
      });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /upload to server/i }),
        );
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/sync",
        expect.objectContaining({ method: "POST" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-loc-1");
    });

    it("Upload to server shows error toast and does not resolve on API failure", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([localOnlyCollection]);
      mockFetch.mockResolvedValueOnce({ ok: false });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /upload to server/i }),
        );
      });
      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it("Delete from device calls db.collections.delete and resolves", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([localOnlyCollection]);
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /delete from device/i }),
        );
      });
      expect(db.collections.delete).toHaveBeenCalledWith("col-loc-1");
      expect(resolveNotification).toHaveBeenCalledWith("n-loc-1");
    });

    it("Upload all resolves successful items and shows toast", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([localOnlyCollection]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ synced: 1 }),
      });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload all/i }));
      });
      expect(toast.success).toHaveBeenCalledWith("1 item uploaded");
    });
  });

  describe("conflicted section", () => {
    it("renders OUT OF SYNC section with server snapshot title", () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);
      render(<SyncReviewPage />);
      expect(screen.getByText(/out of sync/i)).toBeInTheDocument();
      expect(screen.getByText("Shared Recipe (server)")).toBeInTheDocument();
    });

    it("Take server version writes server snapshot to Dexie with Date objects", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(
          screen.getByRole("button", { name: /take server version/i }),
        );
      });
      expect(db.recipes.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "recipe-con-1",
          title: "Shared Recipe (server)",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-con-1");
    });

    it("Keep mine PATCHes recipe on server with local snapshot", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /keep mine/i }));
      });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/recipes/recipe-con-1",
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(resolveNotification).toHaveBeenCalledWith("n-con-1");
    });

    it("Keep mine shows error toast and does not resolve on PATCH failure", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);
      mockFetch.mockResolvedValueOnce({ ok: false });
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /keep mine/i }));
      });
      expect(resolveNotification).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it("Skip resolves without any Dexie or API call", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getAllByRole("button", { name: /^skip$/i })[0]);
      });
      expect(db.recipes.put).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(resolveNotification).toHaveBeenCalledWith("n-con-1");
    });
  });

  describe("Dismiss all", () => {
    it("calls clearSyncNotifications and shows success toast", async () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe]);
      render(<SyncReviewPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /dismiss all/i }));
      });
      expect(clearSyncNotifications).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Sync review cleared");
    });
  });
});
