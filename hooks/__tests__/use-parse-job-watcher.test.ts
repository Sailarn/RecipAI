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

vi.mock("@/lib/db/parse-history", () => ({
  recordParseHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/upload/images", () => ({
  isImageKitUrl: vi.fn().mockReturnValue(false),
  uploadImage: vi.fn(),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

const claimJobCompletion = vi.hoisted(() => vi.fn().mockReturnValue(true));
vi.mock("@/lib/parse-job-completion", () => ({ claimJobCompletion }));

import { toast } from "sonner";
import { db } from "@/lib/db/db";
import { recordParseHistory } from "@/lib/db/parse-history";
import {
  getJobIds,
  getUploadToken,
  removeJobId,
  storePendingUploadToken,
} from "@/lib/parse-job-storage";
import { isImageKitUrl, uploadImage } from "@/lib/upload/images";

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
  makeResponse({
    status: "done",
    result: mockParsedRecipe,
    url: "https://example.com/recipe",
  });
const failedResponse = (error?: string) =>
  makeResponse({ status: "failed", error, url: "https://bad.example.com/x" });
const pendingResponse = () => makeResponse({ status: "pending" });

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  claimJobCompletion.mockReturnValue(true);
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

    it("notifies the parse page when a durable parsedRecipe entry is created", async () => {
      const listener = vi.fn();
      window.addEventListener("parsed-recipe-created", listener);
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(listener).toHaveBeenCalled());
      expect(listener.mock.calls[0][0]).toMatchObject({
        detail: {
          jobId: "job-1",
          entryId: expect.any(String),
        },
      });
      window.removeEventListener("parsed-recipe-created", listener);
    });

    it("records a done parse-history entry", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(recordParseHistory).toHaveBeenCalled());
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "job-1",
          title: "Test Recipe",
          status: "done",
          url: "https://example.com/recipe",
        }),
      );
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
      expect(toast.error).toHaveBeenCalledWith(
        "Could not parse URL",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Details" }),
        }),
      );
    });

    it("records a failed parse-history entry with a friendly reason", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(failedResponse("restricted account"));

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(recordParseHistory).toHaveBeenCalled());
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "job-1",
          status: "failed",
          url: "https://bad.example.com/x",
          title: "bad.example.com",
          reason:
            "This account is private or the content is restricted — only public posts can be parsed.",
        }),
      );
    });

    it("shows generic error message when no error provided", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(failedResponse(undefined));

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to parse recipe",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Details" }),
        }),
      );
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

  describe("deduplication", () => {
    it("does not re-poll a job that is already being watched", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      const { result } = renderHook(() => useParseJobWatcher());

      await waitFor(() =>
        expect(db.parsedRecipes.add).toHaveBeenCalledTimes(1),
      );

      act(() => {
        result.current.poll("job-1");
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(db.parsedRecipes.add).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledTimes(1);
    });

    it("does not spawn a second poll loop when the effect re-runs mid-poll", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(pendingResponse());

      const { rerender } = renderHook(() => useParseJobWatcher());

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      rerender();
      rerender();
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("completion guard", () => {
    it("does not save or toast when the inline page already handled the job", async () => {
      claimJobCompletion.mockReturnValue(false);
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await act(async () => {
        await Promise.resolve();
      });

      expect(db.parsedRecipes.add).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
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
