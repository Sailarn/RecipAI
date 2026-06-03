import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session-state", () => ({
  isSignedIn: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { isSignedIn } from "@/lib/auth/session-state";
import { syncFetch } from "../sync-fetch";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncFetch", () => {
  describe("when not signed in", () => {
    it("does not call fetch", () => {
      vi.mocked(isSignedIn).mockReturnValue(false);

      syncFetch("/api/test", { method: "POST" });

      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("when signed in", () => {
    beforeEach(() => {
      vi.mocked(isSignedIn).mockReturnValue(true);
    });

    it("calls fetch with the given url and init", () => {
      syncFetch("/api/test", { method: "POST", body: '{"x":1}' });

      expect(fetchMock).toHaveBeenCalledWith("/api/test", {
        method: "POST",
        body: '{"x":1}',
      });
    });

    it("does not throw when fetch rejects (network error)", async () => {
      fetchMock.mockRejectedValue(new Error("network error"));

      expect(() => syncFetch("/api/test")).not.toThrow();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    });

    it("does not call Sentry on network errors", async () => {
      fetchMock.mockRejectedValue(new Error("network error"));

      syncFetch("/api/test");
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("captures a Sentry exception when the server returns a non-ok status", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

      syncFetch("/api/test", { method: "POST" });

      await vi.waitFor(() =>
        expect(Sentry.captureException).toHaveBeenCalledOnce(),
      );
      const error = vi.mocked(Sentry.captureException).mock
        .calls[0][0] as Error;
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("500");
      expect(error.message).toContain("/api/test");
    });

    it("does not call Sentry when the response is ok", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      syncFetch("/api/test");
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
});
