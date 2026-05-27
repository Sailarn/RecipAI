/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

vi.mock("../use-sync-actions", () => ({
  useSyncActions: vi.fn().mockReturnValue({
    addToDevice: vi.fn(),
    deleteFromServer: vi.fn(),
    uploadToServer: vi.fn(),
    deleteFromDevice: vi.fn(),
    keepMine: vi.fn(),
    addAll: vi.fn(),
    uploadAll: vi.fn(),
    dismissAll: vi.fn(),
  }),
}));

import { useLiveQuery } from "dexie-react-hooks";
import SyncReviewPage from "../page";

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

describe("SyncReviewPage", () => {
  describe("empty state", () => {
    it("shows empty state when no notifications", () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(<SyncReviewPage />);

      expect(screen.getByText(/everything is in sync/i)).toBeInTheDocument();
    });

    it("does not show Dismiss all when there are no notifications", () => {
      vi.mocked(useLiveQuery).mockReturnValue([]);

      render(<SyncReviewPage />);

      expect(
        screen.queryByRole("button", { name: /dismiss all/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("server_only section", () => {
    it("renders section header and item title", () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe]);

      render(<SyncReviewPage />);

      expect(screen.getByText(/not on this device/i)).toBeInTheDocument();
      expect(screen.getByText("Server Recipe")).toBeInTheDocument();
    });

    it("shows Add to device and Delete from server buttons", () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe]);

      render(<SyncReviewPage />);

      expect(
        screen.getByRole("button", { name: /add to device/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete from server/i }),
      ).toBeInTheDocument();
    });
  });

  describe("local_only section", () => {
    it("renders section header and item name", () => {
      vi.mocked(useLiveQuery).mockReturnValue([localOnlyCollection]);

      render(<SyncReviewPage />);

      expect(screen.getByText(/not on server/i)).toBeInTheDocument();
      expect(screen.getByText(/my collection/i)).toBeInTheDocument();
    });
  });

  describe("conflicted section", () => {
    it("renders section header and server snapshot title", () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);

      render(<SyncReviewPage />);

      expect(screen.getByText(/out of sync/i)).toBeInTheDocument();
      expect(screen.getByText("Shared Recipe (server)")).toBeInTheDocument();
    });

    it("shows Skip, Keep mine, and Take server version buttons", () => {
      vi.mocked(useLiveQuery).mockReturnValue([conflictedRecipe]);

      render(<SyncReviewPage />);

      expect(
        screen.getByRole("button", { name: /^skip$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /keep mine/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /take server version/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Dismiss all", () => {
    it("shows Dismiss all button when notifications exist", () => {
      vi.mocked(useLiveQuery).mockReturnValue([serverOnlyRecipe]);

      render(<SyncReviewPage />);

      expect(
        screen.getByRole("button", { name: /dismiss all/i }),
      ).toBeInTheDocument();
    });
  });
});
