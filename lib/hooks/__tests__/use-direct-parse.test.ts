/**
 * @vitest-environment happy-dom
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";
import { useDirectParse } from "../use-direct-parse";

const recordParseHistory = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
vi.mock("@/lib/db/parse-history", () => ({ recordParseHistory }));

const saveParsedResult = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/save-parsed-recipe", () => ({ saveParsedResult }));

const { announceSavedParse, announceFailedParse } = vi.hoisted(() => ({
  announceSavedParse: vi.fn(),
  announceFailedParse: vi.fn(),
}));
vi.mock("@/lib/parse-recipe/announce-parse", () => ({
  announceSavedParse,
  announceFailedParse,
}));

vi.mock("@/lib/utils", () => ({ generateId: () => "job-1" }));

const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: toastError } }));

const RECIPE = {
  title: "Borscht",
  sourceUrl: "https://echoed.example.com",
} as ParsedRecipe;
const SAVED_RECIPE = { ...RECIPE, sourceUrl: "" };

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe("useDirectParse", () => {
  beforeEach(() => {
    recordParseHistory.mockResolvedValue(undefined);
    saveParsedResult.mockResolvedValue({
      recipeId: "recipe-1",
      alreadySaved: false,
    });
  });

  describe("on success", () => {
    it("passes the job id to the parse and tracks start and success", async () => {
      const parse = vi.fn().mockResolvedValue(RECIPE);
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );

      act(() => result.current.startParse(parse));

      expect(parse).toHaveBeenCalledWith("job-1");
      expect(result.current.isParsing).toBe(true);
      await waitFor(() => expect(result.current.isParsing).toBe(false));
      expect(trackEvent).toHaveBeenCalledWith("parse_started", {
        source: "photo",
      });
      expect(trackEvent).toHaveBeenCalledWith("parse_succeeded", {
        source: "photo",
      });
    });

    it("records a done history entry under the job id", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "text" }),
      );

      act(() => result.current.startParse(() => Promise.resolve(RECIPE)));

      await waitFor(() =>
        expect(recordParseHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            id: "job-1",
            title: "Borscht",
            status: "done",
          }),
        ),
      );
    });

    it("saves the recipe without the link the model echoed", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "uk", source: "text" }),
      );

      act(() => result.current.startParse(() => Promise.resolve(RECIPE)));

      await waitFor(() =>
        expect(saveParsedResult).toHaveBeenCalledWith(SAVED_RECIPE),
      );
    });

    it("announces the saved recipe and shows it on the page", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );

      act(() => result.current.startParse(() => Promise.resolve(RECIPE)));

      await waitFor(() =>
        expect(result.current.saved).toEqual({
          recipeId: "recipe-1",
          alreadySaved: false,
          recipe: SAVED_RECIPE,
        }),
      );
      expect(announceSavedParse).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job-1",
          recipeId: "recipe-1",
          recipe: SAVED_RECIPE,
        }),
      );
    });

    it("still saves and announces after unmount", async () => {
      const pending = deferred<ParsedRecipe>();
      const { result, unmount } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );
      act(() => result.current.startParse(() => pending.promise));

      unmount();
      pending.resolve(RECIPE);

      await waitFor(() => expect(announceSavedParse).toHaveBeenCalled());
      expect(saveParsedResult).toHaveBeenCalledOnce();
    });

    it("shows a toast when saving the recipe fails", async () => {
      saveParsedResult.mockRejectedValue(new Error("quota"));
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );

      act(() => result.current.startParse(() => Promise.resolve(RECIPE)));

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          "processFailed",
          expect.anything(),
        ),
      );
      expect(announceSavedParse).not.toHaveBeenCalled();
    });

    it("still saves when recording history fails", async () => {
      recordParseHistory.mockRejectedValue(new Error("dexie"));
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );

      act(() => result.current.startParse(() => Promise.resolve(RECIPE)));

      await waitFor(() => expect(result.current.saved).not.toBeNull());
      expect(result.current.error).toBeNull();
    });

    it("clearSaved returns to the form", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );
      act(() => result.current.startParse(() => Promise.resolve(RECIPE)));
      await waitFor(() => expect(result.current.saved).not.toBeNull());

      act(() => result.current.clearSaved());

      expect(result.current.saved).toBeNull();
    });
  });

  describe("on failure", () => {
    it("exposes the error message while mounted", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );

      act(() =>
        result.current.startParse(() => Promise.reject(new Error("blurry"))),
      );

      await waitFor(() => expect(result.current.error).toBe("blurry"));
      expect(result.current.isParsing).toBe(false);
      expect(trackEvent).toHaveBeenCalledWith("parse_failed", {
        source: "photo",
        reason: "blurry",
      });
    });

    it("falls back to a generic message for a non-Error rejection", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "text" }),
      );

      act(() => result.current.startParse(() => Promise.reject("boom")));

      await waitFor(() =>
        expect(result.current.error).toBe("parseFailedShort"),
      );
      expect(trackEvent).toHaveBeenCalledWith("parse_failed", {
        source: "text",
        reason: "boom",
      });
    });

    it.each([
      ["photo", "Photo import"],
      ["text", "Text import"],
    ] as const)("records a failed %s history entry", async (source, title) => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source }),
      );

      act(() =>
        result.current.startParse(() => Promise.reject(new Error("bad"))),
      );

      await waitFor(() =>
        expect(recordParseHistory).toHaveBeenCalledWith(
          expect.objectContaining({ id: "job-1", title, status: "failed" }),
        ),
      );
    });

    it("puts the failure in the bell", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );

      act(() =>
        result.current.startParse(() => Promise.reject(new Error("blurry"))),
      );

      await waitFor(() =>
        expect(announceFailedParse).toHaveBeenCalledWith({
          jobId: "job-1",
          title: "Photo import",
          reason: "blurry",
        }),
      );
    });

    it("shows a toast instead of state after unmount", async () => {
      const pending = deferred<ParsedRecipe>();
      const { result, unmount } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );
      act(() => result.current.startParse(() => pending.promise));

      unmount();
      pending.reject(new Error("timeout"));

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          "timeout",
          expect.objectContaining({
            action: expect.objectContaining({ label: "details" }),
          }),
        ),
      );
    });

    it("clears a previous error when a new parse starts", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );
      act(() =>
        result.current.startParse(() => Promise.reject(new Error("first"))),
      );
      await waitFor(() => expect(result.current.error).toBe("first"));

      act(() => result.current.startParse(() => new Promise(() => {})));

      expect(result.current.error).toBeNull();
      expect(result.current.isParsing).toBe(true);
    });
  });

  describe("controls", () => {
    it("stopWaiting ends the parsing state", () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );
      act(() => result.current.startParse(() => new Promise(() => {})));

      act(() => result.current.stopWaiting());

      expect(result.current.isParsing).toBe(false);
    });

    it("clearError removes the error", async () => {
      const { result } = renderHook(() =>
        useDirectParse({ locale: "en", source: "photo" }),
      );
      act(() =>
        result.current.startParse(() => Promise.reject(new Error("x"))),
      );
      await waitFor(() => expect(result.current.error).toBe("x"));

      act(() => result.current.clearError());

      expect(result.current.error).toBeNull();
    });
  });
});
