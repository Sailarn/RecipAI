/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useParseJobWatcher } from "../use-parse-job-watcher";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

vi.mock("@/lib/parse-job-storage", () => ({
  getJobIds: vi.fn().mockReturnValue([]),
  getUploadToken: vi.fn().mockReturnValue(null),
  removeJobId: vi.fn(),
  addJobId: vi.fn(),
  storePendingUploadToken: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    parsedRecipes: {
      add: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock("@/lib/db/save-parsed-recipe", () => ({
  saveParsedRecipe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/images", () => ({
  isImageKitUrl: vi.fn().mockReturnValue(false),
  uploadImage: vi.fn(),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { isImageKitUrl, uploadImage } from "@/lib/images";
import {
  getJobIds,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";

const mockFetch = vi.fn();

const mockParsedRecipe = {
  title: "Test Recipe",
  description: "A test recipe",
  servings: 4,
  prepTime: 10,
  cookTime: 20,
  ingredients: [{ item: "flour", amount: 2, unit: "cups" }],
  instructions: [{ order: 1, instruction: "Mix" }],
  sourceUrl: "https://example.com/recipe",
};

function makeResponse(body: object) {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}
const doneResponse = () =>
  makeResponse({ status: "done", result: mockParsedRecipe });
const failedResponse = (error?: string) =>
  makeResponse({ status: "failed", error });
const pendingResponse = () => makeResponse({ status: "pending" });

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.mocked(getJobIds).mockReturnValue([]);
  vi.mocked(db.parsedRecipes.add).mockResolvedValue(undefined as any);
  vi.mocked(db.parsedRecipes.delete).mockResolvedValue(undefined);
  vi.mocked(isImageKitUrl).mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useParseJobWatcher", () => {
  describe("on mount", () => {
    it("does not poll when no saved job IDs", async () => {
      vi.mocked(getJobIds).mockReturnValue([]);
      renderHook(() => useParseJobWatcher());
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("starts polling all saved job IDs on mount", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1", "job-2"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(mockFetch).toHaveBeenCalledWith("/api/parse-queue/job-1");
      expect(mockFetch).toHaveBeenCalledWith("/api/parse-queue/job-2");
    });
  });

  describe("status: done", () => {
    it("removes job ID and saves to parsedRecipes when done", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(removeJobId).toHaveBeenCalledWith("job-1"));
      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());
    });

    it("shows toast with recipe title when done", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(toast).toHaveBeenCalled());
      expect(toast).toHaveBeenCalledWith(
        "Test Recipe",
        expect.objectContaining({
          description: "Recipe parsed — tap to review",
        }),
      );
    });

    it("saved parsedRecipe entry has correct fields", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());

      const entry = vi.mocked(db.parsedRecipes.add).mock.calls[0][0];
      expect(entry.title).toBe("Test Recipe");
      expect(entry.servings).toBe(4);
      expect(entry.sourceUrl).toBe("https://example.com/recipe");
      expect(entry.createdAt).toBeInstanceOf(Date);
    });

    it("defaults servings to 1 when result has no servings", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: { ...mockParsedRecipe, servings: undefined },
        }),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());
      const entry = vi.mocked(db.parsedRecipes.add).mock.calls[0][0];
      expect(entry.servings).toBe(1);
    });
  });

  describe("status: failed", () => {
    it("removes job ID and shows error toast when failed", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(failedResponse("Could not parse URL"));

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(removeJobId).toHaveBeenCalledWith("job-1"));
      expect(toast.error).toHaveBeenCalledWith("Could not parse URL");
    });

    it("shows generic error message when no error provided", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(failedResponse(undefined));

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Failed to parse recipe");
    });
  });

  describe("status: pending (retry scheduling)", () => {
    it("retries after 3s on pending status", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch
        .mockResolvedValueOnce(pendingResponse())
        .mockResolvedValueOnce(doneResponse());

      renderHook(() => useParseJobWatcher());

      // First poll (pending)
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance 3s to trigger retry
      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());
    });
  });

  describe("network error retry", () => {
    it("retries after 5s on network failure", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(doneResponse());

      renderHook(() => useParseJobWatcher());

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(5000);
        await Promise.resolve();
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    });
  });

  describe("parse-job-created event", () => {
    it("starts polling when parse-job-created event is dispatched", async () => {
      vi.mocked(getJobIds).mockReturnValue([]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      act(() => {
        window.dispatchEvent(
          new CustomEvent("parse-job-created", {
            detail: { jobId: "new-job" },
          }),
        );
      });

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/parse-queue/new-job"),
      );
    });
  });

  describe("cleanup", () => {
    it("removes event listener on unmount", () => {
      vi.mocked(getJobIds).mockReturnValue([]);
      const spy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useParseJobWatcher());
      unmount();

      expect(spy).toHaveBeenCalledWith(
        "parse-job-created",
        expect.any(Function),
      );
    });
  });

  describe("toast callbacks", () => {
    it("Edit cancel deletes parsedRecipe entry so it does not persist in the notification center", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(toast).toHaveBeenCalled());

      const toastOptions = vi.mocked(toast).mock.calls[0][1] as unknown as {
        cancel: { onClick: () => void };
      };

      act(() => {
        toastOptions.cancel.onClick();
      });

      await waitFor(() =>
        expect(db.parsedRecipes.delete).toHaveBeenCalledOnce(),
      );
    });
  });

  describe("image upload", () => {
    it("uploads non-ImageKit imageUrl before saving to parsedRecipes", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      vi.mocked(isImageKitUrl).mockReturnValue(false);
      vi.mocked(uploadImage).mockResolvedValue({
        url: "https://ik.imagekit.io/x/uploaded.jpg",
        fileId: "file-abc",
      });
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: {
            ...mockParsedRecipe,
            imageUrl: "https://external.com/img.jpg",
          },
        }),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());

      expect(uploadImage).toHaveBeenCalledWith("https://external.com/img.jpg", {
        uploadToken: undefined,
      });
      const entry = vi.mocked(db.parsedRecipes.add).mock.calls[0][0];
      expect(entry.imageUrl).toBe("https://ik.imagekit.io/x/uploaded.jpg");
      expect(entry.imageFileId).toBe("file-abc");
    });

    it("skips upload when imageUrl is already an ImageKit URL", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      vi.mocked(isImageKitUrl).mockReturnValue(true);
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: {
            ...mockParsedRecipe,
            imageUrl: "https://ik.imagekit.io/x/image.jpg",
          },
        }),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());
      expect(uploadImage).not.toHaveBeenCalled();
    });

    it("passes upload token from storage to uploadImage", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      vi.mocked(getUploadToken).mockReturnValue("tok-abc");
      vi.mocked(isImageKitUrl).mockReturnValue(false);
      vi.mocked(uploadImage).mockResolvedValue({
        url: "https://ik.imagekit.io/x/uploaded.jpg",
        fileId: "file-abc",
      });
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: {
            ...mockParsedRecipe,
            imageUrl: "https://external.com/img.jpg",
          },
        }),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(uploadImage).toHaveBeenCalled());
      expect(storePendingUploadToken).toHaveBeenCalledWith("tok-abc");
      expect(uploadImage).toHaveBeenCalledWith("https://external.com/img.jpg", {
        uploadToken: "tok-abc",
      });
    });

    it("continues without upload when imageUrl upload fails", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      vi.mocked(isImageKitUrl).mockReturnValue(false);
      vi.mocked(uploadImage).mockRejectedValue(new Error("Upload failed"));
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: {
            ...mockParsedRecipe,
            imageUrl: "https://external.com/img.jpg",
          },
        }),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(db.parsedRecipes.add).toHaveBeenCalled());

      const entry = vi.mocked(db.parsedRecipes.add).mock.calls[0][0];
      // original URL preserved when upload fails
      expect(entry.imageUrl).toBe("https://external.com/img.jpg");
    });
  });
});
