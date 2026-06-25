/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/telemetry";
import { useUrlParse } from "../use-url-parse";

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn(),
}));

vi.mock("@/lib/db/db", () => ({
  db: {
    parsedRecipes: {
      add: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      orderBy: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/parse-history", () => ({
  recordParseHistory: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/parse-job-storage", () => ({
  getJobIds: vi.fn().mockReturnValue([]),
  getUploadToken: vi.fn().mockReturnValue(null),
  removeJobId: vi.fn(),
  addJobId: vi.fn(),
  storePendingUploadToken: vi.fn(),
}));

vi.mock("@/lib/hooks/use-push-subscription", () => ({
  usePushSubscription: () => ({
    subscription: null,
    subscribe: vi.fn().mockResolvedValue(null),
    isSupported: false,
    permission: "default",
  }),
}));

vi.mock("@/lib/parse-recipe/friendly-parse-error", () => ({
  friendlyParseError: vi.fn((msg: string) => msg),
}));

vi.mock("@/lib/parse-recipe/parse-history-entry", () => ({
  doneParseHistoryEntry: vi.fn(() => ({ status: "done" })),
  failedParseHistoryEntry: vi.fn(() => ({ status: "failed" })),
}));

const claimJobCompletion = vi.hoisted(() => vi.fn().mockReturnValue(true));
vi.mock("@/lib/parse-job-completion", () => ({ claimJobCompletion }));

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/db";
import { addJobId, getJobIds } from "@/lib/parse-job-storage";

const mockFetch = vi.fn();
const parsedRecipeEntries = new Map<string, unknown>();

function makeResponse(body: object) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function mockParsedRecipesLiveQuery() {
  vi.mocked(useLiveQuery).mockImplementation((_, dependencies?: unknown[]) => {
    const activeId = dependencies?.[0];
    if (typeof activeId === "string") {
      return parsedRecipeEntries.get(activeId) as never;
    }
    return [...parsedRecipeEntries.values()].at(-1) as never;
  });
  vi.mocked(db.parsedRecipes.add).mockImplementation(((entry: {
    id: string;
  }) => {
    const entryId = (entry as { id: string }).id;
    parsedRecipeEntries.set(entryId, entry);
    return Promise.resolve(entryId);
  }) as never);
  vi.mocked(db.parsedRecipes.delete).mockImplementation(((id: string) => {
    parsedRecipeEntries.delete(String(id));
    return Promise.resolve();
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  parsedRecipeEntries.clear();
  mockParsedRecipesLiveQuery();
  vi.mocked(getJobIds).mockReturnValue([]);
  claimJobCompletion.mockReturnValue(true);
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useUrlParse", () => {
  describe("parse_started tracking", () => {
    it("tracks parse_started with the source domain on successful job creation", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/parse-queue") {
          return Promise.resolve(
            makeResponse({ jobId: "job-1", uploadToken: null }),
          );
        }
        if (url === "/api/parse-queue/process") {
          return Promise.resolve(makeResponse({}));
        }
        return Promise.resolve(makeResponse({ status: "pending" }));
      });

      const { result } = renderHook(() => useUrlParse({ locale: "en" }));

      act(() => {
        result.current.setUrl("https://example.com/recipe");
      });

      await act(async () => {
        await result.current.handleParse();
      });

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("parse_started", {
          source: "url",
          domain: expect.any(String),
        });
      });
    });
  });

  describe("parse_succeeded tracking", () => {
    it("stores a durable parsed recipe entry when polling returns done", async () => {
      const mockRecipe = {
        title: "Test Recipe",
        ingredients: [],
        instructions: [],
        servings: 2,
        sourceUrl: "https://example.com/recipe",
      };

      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: mockRecipe,
          url: "https://example.com/recipe",
        }),
      );

      renderHook(() => useUrlParse({ locale: "en" }));

      await waitFor(() => {
        expect(db.parsedRecipes.add).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Test Recipe",
            sourceUrl: "https://example.com/recipe",
          }),
        );
        expect(trackEvent).toHaveBeenCalledWith("parse_succeeded", {
          source: "url",
        });
      });
    });
  });

  describe("parse_failed tracking", () => {
    it("tracks parse_failed when polling returns failed status", async () => {
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "failed",
          error: "Could not parse page",
          url: "https://example.com/recipe",
        }),
      );

      renderHook(() => useUrlParse({ locale: "en" }));

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("parse_failed", {
          source: "url",
          reason: "Could not parse page",
        });
      });
    });
  });

  describe("cache hit", () => {
    it("stores the cached result and shows it inline without the background handoff", async () => {
      const mockRecipe = {
        title: "Cached Recipe",
        ingredients: [],
        instructions: [],
        servings: 2,
        sourceUrl: "https://example.com/recipe",
      };
      mockFetch.mockImplementation((requestUrl: string) => {
        if (requestUrl === "/api/parse-queue") {
          return Promise.resolve(
            makeResponse({
              jobId: "job-1",
              uploadToken: null,
              cached: true,
              result: mockRecipe,
            }),
          );
        }
        return Promise.resolve(makeResponse({}));
      });

      const { result } = renderHook(() => useUrlParse({ locale: "en" }));

      act(() => {
        result.current.setUrl("https://example.com/recipe");
      });
      await act(async () => {
        await result.current.handleParse();
      });

      expect(db.parsedRecipes.add).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Cached Recipe",
          sourceUrl: "https://example.com/recipe",
        }),
      );
      expect(result.current.result).toEqual(
        expect.objectContaining({ title: "Cached Recipe" }),
      );
      expect(result.current.jobId).toBeNull();
      expect(addJobId).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalledWith(
        "/api/parse-queue/process",
        expect.anything(),
      );
      expect(trackEvent).toHaveBeenCalledWith("parse_succeeded", {
        source: "url",
      });
    });

    it("removes the durable entry when the inline result is saved", async () => {
      const mockRecipe = {
        title: "Cached Recipe",
        ingredients: [],
        instructions: [],
        servings: 2,
        sourceUrl: "https://example.com/recipe",
      };
      mockFetch.mockImplementation((requestUrl: string) => {
        if (requestUrl === "/api/parse-queue") {
          return Promise.resolve(
            makeResponse({
              jobId: "job-1",
              uploadToken: null,
              cached: true,
              result: mockRecipe,
            }),
          );
        }
        return Promise.resolve(makeResponse({}));
      });

      const { result } = renderHook(() => useUrlParse({ locale: "en" }));

      act(() => {
        result.current.setUrl("https://example.com/recipe");
      });
      await act(async () => {
        await result.current.handleParse();
      });
      await act(async () => {
        result.current.handleSave();
      });

      const storedEntry = vi.mocked(db.parsedRecipes.add).mock.calls[0]?.[0] as
        | { id: string }
        | undefined;
      expect(db.parsedRecipes.delete).toHaveBeenCalledWith(storedEntry?.id);
    });

    it("removes the durable entry when the inline result is reset", async () => {
      const mockRecipe = {
        title: "Cached Recipe",
        ingredients: [],
        instructions: [],
        servings: 2,
        sourceUrl: "https://example.com/recipe",
      };
      mockFetch.mockImplementation((requestUrl: string) => {
        if (requestUrl === "/api/parse-queue") {
          return Promise.resolve(
            makeResponse({
              jobId: "job-1",
              uploadToken: null,
              cached: true,
              result: mockRecipe,
            }),
          );
        }
        return Promise.resolve(makeResponse({}));
      });

      const { result } = renderHook(() => useUrlParse({ locale: "en" }));

      act(() => {
        result.current.setUrl("https://example.com/recipe");
      });
      await act(async () => {
        await result.current.handleParse();
      });
      await act(async () => {
        await result.current.handleReset();
      });

      const storedEntry = vi.mocked(db.parsedRecipes.add).mock.calls[0]?.[0] as
        | { id: string }
        | undefined;
      expect(db.parsedRecipes.delete).toHaveBeenCalledWith(storedEntry?.id);
      expect(result.current.url).toBe("");
    });
  });

  describe("background completion handoff", () => {
    it("shows the durable entry when the global watcher handles the active job", async () => {
      mockFetch.mockImplementation((requestUrl: string) => {
        if (requestUrl === "/api/parse-queue") {
          return Promise.resolve(
            makeResponse({ jobId: "job-1", uploadToken: null }),
          );
        }
        if (requestUrl === "/api/parse-queue/process") {
          return Promise.resolve(makeResponse({}));
        }
        return Promise.resolve(makeResponse({ status: "pending" }));
      });

      const { result } = renderHook(() => useUrlParse({ locale: "en" }));

      act(() => {
        result.current.setUrl("https://example.com/recipe");
      });
      await act(async () => {
        await result.current.handleParse();
      });

      parsedRecipeEntries.set("entry-1", {
        id: "entry-1",
        title: "Background Recipe",
        servings: 1,
        ingredients: [],
        instructions: [],
        sourceUrl: "https://example.com/recipe",
        createdAt: new Date(),
      });
      act(() => {
        window.dispatchEvent(
          new CustomEvent("parsed-recipe-created", {
            detail: { jobId: "job-1", entryId: "entry-1" },
          }),
        );
      });

      await waitFor(() => {
        expect(result.current.result).toEqual(
          expect.objectContaining({ title: "Background Recipe" }),
        );
        expect(result.current.jobId).toBeNull();
      });
    });
  });

  describe("completion guard", () => {
    it("does not re-run side effects when the watcher already handled the job", async () => {
      claimJobCompletion.mockReturnValue(false);
      vi.mocked(getJobIds).mockReturnValue(["job-1"]);
      mockFetch.mockResolvedValue(
        makeResponse({
          status: "done",
          result: { title: "Test Recipe", ingredients: [], instructions: [] },
          url: "https://example.com/recipe",
        }),
      );

      const { result } = renderHook(() => useUrlParse({ locale: "en" }));

      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.result).toBeNull();
      expect(trackEvent).not.toHaveBeenCalledWith("parse_succeeded", {
        source: "url",
      });
    });
  });
});
