import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SOURCE_FETCH_FAILED } from "../source-image-failure";
import { resolveImageSource } from "../upload-image-source";
import { MAX_IMAGE_BYTES, UPLOAD_ERRORS } from "../upload-limits";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/images/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function imageResponse(bytes: number, contentType = "image/jpeg"): Response {
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: { "content-type": contentType },
  });
}

async function errorOf(request: Request): Promise<string> {
  const result = await resolveImageSource(request);
  if (result.ok) throw new Error("expected a failed resolve");
  return (await result.response.json()).error;
}

describe("resolveImageSource", () => {
  describe("multipart upload", () => {
    function multipartRequest(file?: File): Request {
      const form = new FormData();
      if (file) form.append("file", file);
      return new Request("http://localhost/api/images/upload", {
        method: "POST",
        body: form,
      });
    }

    it("returns the file as base64 with its name", async () => {
      const file = new File([new Uint8Array([1, 2, 3])], "photo.png", {
        type: "image/png",
      });

      const result = await resolveImageSource(multipartRequest(file));

      expect(result).toEqual({
        ok: true,
        source: { fileData: "AQID", fileName: "photo.png" },
      });
    });

    it("rejects an unsupported type", async () => {
      const file = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });

      expect(await errorOf(multipartRequest(file))).toBe(
        UPLOAD_ERRORS.UNSUPPORTED_TYPE,
      );
    });

    it("rejects a form without a file", async () => {
      expect(await errorOf(multipartRequest())).toBe("No file provided");
    });
  });

  describe("remote url", () => {
    it("downloads the image and keeps the given file name", async () => {
      fetchMock.mockResolvedValue(imageResponse(3));

      const result = await resolveImageSource(
        jsonRequest({ url: "https://cdn.test/a.jpg", fileName: "a.jpg" }),
      );

      expect(result).toEqual({
        ok: true,
        source: { fileData: "AAAA", fileName: "a.jpg" },
      });
    });

    it("reports a non-2xx source as a failed source fetch", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 403 }));

      expect(
        await errorOf(jsonRequest({ url: "https://cdn.test/a.jpg" })),
      ).toBe(SOURCE_FETCH_FAILED);
    });

    it("reports a network failure as a failed source fetch", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));

      expect(
        await errorOf(jsonRequest({ url: "https://cdn.test/a.jpg" })),
      ).toBe(SOURCE_FETCH_FAILED);
    });

    it("rejects a non-image response", async () => {
      fetchMock.mockResolvedValue(imageResponse(3, "text/html"));

      expect(await errorOf(jsonRequest({ url: "https://cdn.test/a" }))).toBe(
        UPLOAD_ERRORS.UNSUPPORTED_TYPE,
      );
    });

    it("rejects an oversized image", async () => {
      fetchMock.mockResolvedValue(imageResponse(MAX_IMAGE_BYTES + 1));

      expect(
        await errorOf(jsonRequest({ url: "https://cdn.test/a.jpg" })),
      ).toBe(UPLOAD_ERRORS.FILE_TOO_LARGE);
    });
  });

  describe("base64 payload", () => {
    it("passes the payload through with a generated name when none is given", async () => {
      const result = await resolveImageSource(jsonRequest({ file: "AQID" }));

      expect(result.ok && result.source.fileData).toBe("AQID");
      expect(result.ok && result.source.fileName).toMatch(/^recipe-\d+$/);
    });
  });

  describe("invalid bodies", () => {
    it("rejects malformed JSON", async () => {
      const request = new Request("http://localhost/api/images/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      });

      const result = await resolveImageSource(request);

      expect(result.ok).toBe(false);
    });

    it("rejects a body with no image source", async () => {
      expect(await errorOf(jsonRequest({ fileName: "x.jpg" }))).toBe(
        "No image source provided",
      );
    });
  });
});
