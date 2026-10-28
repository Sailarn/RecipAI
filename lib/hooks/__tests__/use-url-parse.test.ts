/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";
import { dispatchParseJobSettled } from "@/lib/parse-job-events";
import { trackEvent } from "@/lib/telemetry";
import { useUrlParse } from "../use-url-parse";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/lib/parse-job-storage", () => ({
  getJobIds: vi.fn().mockReturnValue([]),
  addJobId: vi.fn(),
}));

vi.mock("@/lib/hooks/use-push-subscription", () => ({
  usePushSubscription: () => ({
    subscription: null,
    subscribe: vi.fn().mockResolvedValue(null),
    isSupported: false,
    permission: "default",
  }),
}));

const { completeLinkParse, claimJobCompletion, triggerSync } = vi.hoisted(
  () => ({
    completeLinkParse: vi.fn(),
    claimJobCompletion: vi.fn(),
    triggerSync: vi.fn(),
  }),
);
vi.mock("@/lib/parse-recipe/complete-link-parse", () => ({
  completeLinkParse,
}));
vi.mock("@/lib/parse-job-completion", () => ({ claimJobCompletion }));
vi.mock("@/lib/sync-context", () => ({ useTriggerSync: () => triggerSync }));

import { addJobId, getJobIds } from "@/lib/parse-job-storage";

const RECIPE_URL = "https://example.com/recipe";
const recipe = {
  title: "Soup",
  servings: 2,
  ingredients: [],
  instructions: [],
  sourceUrl: RECIPE_URL,
} as ParsedRecipe;

const mockFetch = vi.fn();

function makeResponse(body: object) {
  return { ok: true, json: () => Promise.resolve(body) } as unknown as Response;
}

function enqueueResponds(body: object) {
  mockFetch.mockImplementation((url: string) =>
    Promise.resolve(
      url === "/api/parse-queue"
        ? makeResponse({ telegramNotify: false, serverSaves: false, ...body })
        : makeResponse({}),
    ),
  );
}

async function startParse(options: { telegramNotify?: boolean } = {}) {
  const hook = renderHook(() => useUrlParse(options));
  act(() => hook.result.current.setUrl(RECIPE_URL));
  await act(() => hook.result.current.handleParse());
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getJobIds).mockReturnValue([]);
  completeLinkParse.mockResolvedValue({
    recipeId: "recipe-1",
    alreadySaved: false,
  });
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUrlParse", () => {
  describe("starting a parse", () => {
    it("rejects an invalid link without calling the server", async () => {
      const { result } = renderHook(() => useUrlParse());
      act(() => result.current.setUrl("not a url"));

      await act(() => result.current.handleParse());

      expect(result.current.error).toBe("invalidUrl");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("tracks the start with the source domain", async () => {
      enqueueResponds({ jobId: "job-1", cached: false });

      await startParse();

      expect(trackEvent).toHaveBeenCalledWith("parse_started", {
        source: "url",
        domain: "example.com",
      });
    });

    it("hands a slow parse to the watcher and starts /process", async () => {
      enqueueResponds({ jobId: "job-1", cached: false, uploadToken: "t1" });
      const listener = vi.fn();
      window.addEventListener("parse-job-created", listener);

      const { result } = await startParse();

      window.removeEventListener("parse-job-created", listener);
      expect(addJobId).toHaveBeenCalledWith("job-1", "t1");
      expect(listener.mock.calls[0][0].detail).toEqual({ jobId: "job-1" });
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/parse-queue/process",
        expect.objectContaining({ method: "POST" }),
      );
      expect(result.current.jobId).toBe("job-1");
      expect(result.current.loading).toBe(false);
    });

    it("leaves /process to the server for a Telegram-notify parse", async () => {
      enqueueResponds({ jobId: "job-1", cached: false, telegramNotify: true });

      await startParse({ telegramNotify: true });

      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/parse-queue/process",
        expect.anything(),
      );
    });

    it("shows a network error when the server can't be reached", async () => {
      mockFetch.mockRejectedValue(new Error("offline"));

      const { result } = await startParse();

      expect(result.current.error).toBe("networkError");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("cache hit", () => {
    it("completes the parse right away and shows the saved recipe", async () => {
      enqueueResponds({
        jobId: "job-1",
        cached: true,
        result: recipe,
        uploadToken: "t1",
      });

      const { result } = await startParse();

      expect(claimJobCompletion).toHaveBeenCalledWith("job-1");
      expect(completeLinkParse).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job-1",
          recipe,
          jobUrl: RECIPE_URL,
          uploadToken: "t1",
          savedRecipeId: undefined,
        }),
      );
      expect(result.current.saved).toEqual({
        recipeId: "recipe-1",
        alreadySaved: false,
        recipe,
      });
      expect(addJobId).not.toHaveBeenCalled();
    });

    it("passes on the recipe the server saved for a signed-in user", async () => {
      enqueueResponds({
        jobId: "job-1",
        cached: true,
        result: recipe,
        serverSaves: true,
        savedRecipeId: "server-1",
        alreadySaved: true,
      });

      await startParse();

      expect(completeLinkParse).toHaveBeenCalledWith(
        expect.objectContaining({
          savedRecipeId: "server-1",
          alreadySaved: true,
          triggerSync,
        }),
      );
    });
  });

  describe("when the watcher settles the followed job", () => {
    it("shows the saved recipe", async () => {
      enqueueResponds({ jobId: "job-1", cached: false });
      const { result } = await startParse();

      act(() =>
        dispatchParseJobSettled({
          jobId: "job-1",
          status: "done",
          recipeId: "recipe-1",
          recipe,
          alreadySaved: true,
        }),
      );

      expect(result.current.saved).toEqual({
        recipeId: "recipe-1",
        recipe,
        alreadySaved: true,
      });
      expect(result.current.jobId).toBeNull();
    });

    it("shows the failure", async () => {
      enqueueResponds({ jobId: "job-1", cached: false });
      const { result } = await startParse();

      act(() =>
        dispatchParseJobSettled({
          jobId: "job-1",
          status: "failed",
          reason: "No recipe found",
        }),
      );

      expect(result.current.error).toBe("No recipe found");
      expect(result.current.jobId).toBeNull();
    });

    it("ignores other jobs", async () => {
      enqueueResponds({ jobId: "job-1", cached: false });
      const { result } = await startParse();

      act(() =>
        dispatchParseJobSettled({
          jobId: "other-job",
          status: "failed",
          reason: "nope",
        }),
      );

      expect(result.current.error).toBeNull();
      expect(result.current.jobId).toBe("job-1");
    });
  });

  describe("resuming", () => {
    it("follows the newest unfinished job after a reload", async () => {
      vi.mocked(getJobIds).mockReturnValue(["old-job", "job-2"]);

      const { result } = renderHook(() => useUrlParse());

      await waitFor(() => expect(result.current.jobId).toBe("job-2"));
    });
  });

  describe("Parse another", () => {
    it("lets go of a running job so its outcome no longer lands here", async () => {
      enqueueResponds({ jobId: "job-1", cached: false });
      const { result } = await startParse();

      act(() => result.current.handleReset());
      act(() =>
        dispatchParseJobSettled({
          jobId: "job-1",
          status: "done",
          recipeId: "recipe-1",
          recipe,
          alreadySaved: false,
        }),
      );

      expect(result.current.saved).toBeNull();
      expect(result.current.jobId).toBeNull();
      expect(result.current.url).toBe("");
    });

    it("clears the saved card", async () => {
      enqueueResponds({ jobId: "job-1", cached: true, result: recipe });
      const { result } = await startParse();
      expect(result.current.saved).not.toBeNull();

      act(() => result.current.handleReset());

      expect(result.current.saved).toBeNull();
    });
  });
});
