/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/lib/telemetry";
import { useUrlParse } from "../use-url-parse";

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

import { getJobIds } from "@/lib/parse-job-storage";

const mockFetch = vi.fn();

function makeResponse(body: object) {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  vi.mocked(getJobIds).mockReturnValue([]);
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
    it("tracks parse_succeeded when polling returns done", async () => {
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
});
