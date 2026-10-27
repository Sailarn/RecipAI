import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHtmlWithPhantomJs } from "../phantomjs";

const fetchMock = vi.fn();
const PAGE_HTML = `<html>${"x".repeat(1200)}</html>`;

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), init);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("PHANTOMJS_API_KEY", "test-key");
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchHtmlWithPhantomJs", () => {
  describe("response shapes", () => {
    it("reads frameData content", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          pageResponses: [{ frameData: { content: PAGE_HTML } }],
        }),
      );

      expect(await fetchHtmlWithPhantomJs("https://site.test/r")).toBe(
        PAGE_HTML,
      );
      expect(fetchMock.mock.calls[0][0]).toBe(
        "https://phantomjscloud.com/api/browser/v2/test-key/",
      );
    });

    it("falls back to content.data", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ content: { data: PAGE_HTML } }),
      );

      expect(await fetchHtmlWithPhantomJs("https://site.test/r")).toBe(
        PAGE_HTML,
      );
    });
  });

  describe("failures", () => {
    it("requires an API key", async () => {
      vi.stubEnv("PHANTOMJS_API_KEY", "");

      await expect(
        fetchHtmlWithPhantomJs("https://site.test/r"),
      ).rejects.toThrow("PHANTOMJS_API_KEY not configured");
    });

    it("throws on a non-2xx response", async () => {
      fetchMock.mockResolvedValue(
        new Response(null, { status: 402, statusText: "Payment Required" }),
      );

      await expect(
        fetchHtmlWithPhantomJs("https://site.test/r"),
      ).rejects.toThrow("PhantomJsCloud error: Payment Required");
    });

    it("throws when no HTML came back", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ pageResponses: [] }));

      await expect(
        fetchHtmlWithPhantomJs("https://site.test/r"),
      ).rejects.toThrow("returned no HTML");
    });

    it("throws when the page is too small to be a recipe", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ content: { data: "<html/>" } }),
      );

      await expect(
        fetchHtmlWithPhantomJs("https://site.test/r"),
      ).rejects.toThrow("too little HTML");
    });
  });
});
