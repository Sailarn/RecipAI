/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useParseJobWatcher } from "../use-parse-job-watcher";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

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
}));

vi.mock("@/lib/db/parse-history", () => ({
  recordParseHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));

const { completeLinkParse, announceFailedParse, triggerSync, useSession } =
  vi.hoisted(() => ({
    completeLinkParse: vi.fn(),
    announceFailedParse: vi.fn(),
    triggerSync: vi.fn(),
    useSession: vi.fn(),
  }));
vi.mock("@/lib/parse-recipe/complete-link-parse", () => ({
  completeLinkParse,
}));
vi.mock("@/lib/parse-recipe/announce-parse", () => ({ announceFailedParse }));
vi.mock("@/lib/sync-context", () => ({ useTriggerSync: () => triggerSync }));
vi.mock("@/lib/auth/auth-client", () => ({
  authClient: { useSession },
}));

const claimJobCompletion = vi.hoisted(() => vi.fn().mockReturnValue(true));
vi.mock("@/lib/parse-job-completion", () => ({ claimJobCompletion }));

import { toast } from "sonner";
import { recordParseHistory } from "@/lib/db/parse-history";
import {
  getJobIds,
  getUploadToken,
  removeJobId,
} from "@/lib/parse-job-storage";

const mockFetch = vi.fn();

const mockParsedRecipe = {
  title: "Test Recipe",
  servings: 4,
  ingredients: [{ item: "flour", amount: 2, unit: "cups" }],
  instructions: [{ order: 1, instruction: "Mix" }],
  sourceUrl: "https://example.com/recipe",
};

function makeResponse(body: object) {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}
const doneResponse = (extra: object = {}) =>
  makeResponse({
    status: "done",
    result: mockParsedRecipe,
    url: "https://example.com/recipe",
    ...extra,
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
  vi.mocked(getUploadToken).mockReturnValue(null);
  completeLinkParse.mockResolvedValue({
    recipeId: "recipe-1",
    alreadySaved: false,
  });
  triggerSync.mockResolvedValue(undefined);
  useSession.mockReturnValue({ data: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useParseJobWatcher", () => {
  describe("on mount", () => {
    it("does not poll when no saved job IDs", async () => {
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

  describe("signed in", () => {
    it("follows the server's unfinished jobs from any device", async () => {
      useSession.mockReturnValue({ data: { user: { id: "u1" } } });
      mockFetch.mockImplementation((url: string) =>
        Promise.resolve(
          url === "/api/parse-queue/active"
            ? makeResponse({ jobs: [{ id: "remote-job" }] })
            : pendingResponse(),
        ),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith("/api/parse-queue/remote-job"),
      );
    });

    it("checks the server's jobs again when the app returns to the foreground", async () => {
      useSession.mockReturnValue({ data: { user: { id: "u1" } } });
      mockFetch.mockResolvedValue(makeResponse({ jobs: [] }));
      renderHook(() => useParseJobWatcher());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      expect(mockFetch).toHaveBeenLastCalledWith("/api/parse-queue/active");
    });

    it("does not ask the server while signed out", async () => {
      renderHook(() => useParseJobWatcher());
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockFetch).not.toHaveBeenCalledWith("/api/parse-queue/active");
    });
  });

  describe("status: done", () => {
    it("removes the job and completes it with the parsed recipe", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      vi.mocked(getUploadToken).mockReturnValue("token-1");
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() =>
        expect(completeLinkParse).toHaveBeenCalledWith(
          expect.objectContaining({
            jobId: "job-1",
            recipe: mockParsedRecipe,
            jobUrl: "https://example.com/recipe",
            savedRecipeId: undefined,
            uploadToken: "token-1",
            labels: { added: "addedToRecipes", alreadySaved: "alreadySaved" },
          }),
        ),
      );
      expect(removeJobId).toHaveBeenCalledWith("job-1");
    });

    it("passes on the recipe the server already saved", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse({ savedRecipeId: "server-1" }));

      renderHook(() => useParseJobWatcher());

      await waitFor(() =>
        expect(completeLinkParse).toHaveBeenCalledWith(
          expect.objectContaining({ savedRecipeId: "server-1" }),
        ),
      );
    });

    it("lets completion pull a server-saved recipe through the sync", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse({ savedRecipeId: "server-1" }));
      renderHook(() => useParseJobWatcher());
      await waitFor(() => expect(completeLinkParse).toHaveBeenCalled());

      await completeLinkParse.mock.calls[0][0].triggerSync();

      expect(triggerSync).toHaveBeenCalledOnce();
    });
  });

  describe("status: failed", () => {
    it("removes the job, puts it in the bell and shows an error toast", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(failedResponse("Recipe not found"));

      renderHook(() => useParseJobWatcher());

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Recipe not found",
          expect.objectContaining({
            action: expect.objectContaining({ label: "details" }),
          }),
        ),
      );
      expect(removeJobId).toHaveBeenCalledWith("job-1");
      expect(announceFailedParse).toHaveBeenCalledWith({
        jobId: "job-1",
        title: "bad.example.com",
        reason: "Recipe not found",
      });
    });

    it("records a failed parse-history entry with a friendly reason", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(
        failedResponse("Couldn't extract a recipe from this page"),
      );

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(recordParseHistory).toHaveBeenCalled());
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "job-1",
          status: "failed",
          title: "bad.example.com",
          reason: expect.stringContaining("No recipe found"),
        }),
      );
    });

    it("shows generic error message when no error provided", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(failedResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "failedGeneric",
          expect.anything(),
        ),
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
      await waitFor(() => expect(completeLinkParse).toHaveBeenCalled());
    });

    it("backs off between polls instead of asking every 3s forever", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(pendingResponse());

      renderHook(() => useParseJobWatcher());

      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second gap is 4.5s, so 3s more is not yet enough for a third poll.
      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);

      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("gives up on a job still processing after the watch deadline", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(
        makeResponse({ status: "pending", url: "https://example.com/recipe" }),
      );

      renderHook(() => useParseJobWatcher());

      await act(async () => {
        await Promise.resolve();
      });

      // Run out the 15-minute deadline across the backed-off poll schedule.
      for (let index = 0; index < 60; index += 1) {
        await act(async () => {
          vi.advanceTimersByTime(30_000);
          await Promise.resolve();
        });
      }

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "timedOut",
          expect.objectContaining({
            action: expect.objectContaining({ label: "details" }),
          }),
        ),
      );
      expect(removeJobId).toHaveBeenCalledWith("job-1");
      expect(recordParseHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "job-1",
          status: "failed",
          reason: "Parsing timed out — the job never finished.",
        }),
      );
    });

    it("stops polling once it has given up", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(pendingResponse());

      renderHook(() => useParseJobWatcher());

      await act(async () => {
        await Promise.resolve();
      });
      for (let index = 0; index < 60; index += 1) {
        await act(async () => {
          vi.advanceTimersByTime(30_000);
          await Promise.resolve();
        });
      }

      const callsAtGiveUp = mockFetch.mock.calls.length;
      await act(async () => {
        vi.advanceTimersByTime(120_000);
        await Promise.resolve();
      });

      expect(mockFetch).toHaveBeenCalledTimes(callsAtGiveUp);
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

      await waitFor(() => expect(completeLinkParse).toHaveBeenCalledTimes(1));

      act(() => {
        result.current.poll("job-1");
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(completeLinkParse).toHaveBeenCalledTimes(1);
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

  describe("re-renders", () => {
    it("keeps polling when the component re-renders between polls", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch
        .mockResolvedValueOnce(pendingResponse())
        .mockResolvedValueOnce(doneResponse());
      const { rerender } = renderHook(() => useParseJobWatcher());
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // e.g. a navigation-stack change re-renders the watcher mid-parse.
      rerender();
      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(completeLinkParse).toHaveBeenCalled());
    });
  });

  describe("Strict Mode", () => {
    it("keeps exactly one poll loop through the dev remount", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(pendingResponse());
      renderHook(() => useParseJobWatcher(), { wrapper: StrictMode });
      await act(async () => {
        await Promise.resolve();
      });
      const callsAfterMount = mockFetch.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledTimes(callsAfterMount + 1),
      );
    });
  });

  describe("completion guard", () => {
    it("does not complete a job the parse page already handled", async () => {
      claimJobCompletion.mockReturnValue(false);
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(doneResponse());

      renderHook(() => useParseJobWatcher());

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await act(async () => {
        await Promise.resolve();
      });

      expect(completeLinkParse).not.toHaveBeenCalled();
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
});
