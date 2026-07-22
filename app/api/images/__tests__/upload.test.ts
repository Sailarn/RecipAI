import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/upload/imagekit", () => ({
  imagekit: {
    upload: vi.fn(),
  },
}));
vi.mock("@/lib/upload/upload-auth", () => ({
  requireUploadAuth: vi.fn(),
}));

import { imagekit } from "@/lib/upload/imagekit";
import { requireUploadAuth } from "@/lib/upload/upload-auth";
import { UPLOAD_ERRORS } from "@/lib/upload/upload-limits";
import { POST } from "../upload/route";

const mockUploadResult = {
  url: "https://ik.imagekit.io/test/recipe.jpg",
  fileId: "file-123",
};

function makeJsonRequest(
  body: object,
  extraHeaders: Record<string, string> = {},
) {
  return new Request("http://localhost/api/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
}

function makeFetchResponse(
  ok: boolean,
  contentType = "image/jpeg",
  byteLength = 8,
) {
  return {
    ok,
    headers: {
      get: (key: string) => (key === "content-type" ? contentType : null),
    },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(byteLength)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authorised.
  vi.mocked(requireUploadAuth).mockResolvedValue(null);
});

describe("POST /api/images/upload", () => {
  describe("authentication", () => {
    it("returns 401 when requireUploadAuth rejects the request", async () => {
      vi.mocked(requireUploadAuth).mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }) as never,
      );

      const res = await POST(makeJsonRequest({ file: "base64data==" }));

      expect(res.status).toBe(401);
    });

    it("delegates auth decisions to requireUploadAuth", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as never);

      await POST(makeJsonRequest({ file: "base64data==" }));

      expect(requireUploadAuth).toHaveBeenCalledOnce();
    });
  });

  describe("JSON body (url or base64)", () => {
    it("returns 400 when no image source provided", async () => {
      const res = await POST(makeJsonRequest({}));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "No image source provided" });
    });

    it("uploads base64 file and returns url and fileId", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as never);

      const res = await POST(
        makeJsonRequest({ file: "base64data==", fileName: "my-recipe.jpg" }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        url: mockUploadResult.url,
        fileId: mockUploadResult.fileId,
      });
    });

    it("calls imagekit.upload with correct folder and fileName", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as never);

      await POST(
        makeJsonRequest({ file: "base64data==", fileName: "my-recipe.jpg" }),
      );

      expect(imagekit.upload).toHaveBeenCalledWith({
        file: "base64data==",
        fileName: "my-recipe.jpg",
        folder: "/recipes",
      });
    });

    it("uses default fileName when not provided", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as never);

      await POST(makeJsonRequest({ file: "base64data==" }));

      expect(imagekit.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: expect.stringMatching(/^recipe-\d+$/),
          folder: "/recipes",
        }),
      );
    });

    it("fetches image from URL and uploads it", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as never);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(makeFetchResponse(true)),
      );

      const res = await POST(
        makeJsonRequest({ url: "https://example.com/image.jpg" }),
      );

      expect(res.status).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        "https://example.com/image.jpg",
        expect.objectContaining({
          headers: expect.objectContaining({
            "User-Agent": expect.stringContaining("Mozilla/5.0"),
          }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it("returns 400 when URL fetch fails", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(makeFetchResponse(false)),
      );

      const res = await POST(
        makeJsonRequest({ url: "https://example.com/image.jpg" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Failed to fetch image from URL" });

      vi.unstubAllGlobals();
    });

    it("returns 400 when URL content-type is not an allowed image type", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(makeFetchResponse(true, "application/pdf")),
      );

      const res = await POST(
        makeJsonRequest({ url: "https://example.com/file.pdf" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: UPLOAD_ERRORS.UNSUPPORTED_TYPE });

      vi.unstubAllGlobals();
    });

    it("returns 400 when URL response exceeds 10 MB", async () => {
      const overLimit = 10 * 1024 * 1024 + 1;
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(makeFetchResponse(true, "image/jpeg", overLimit)),
      );

      const res = await POST(
        makeJsonRequest({ url: "https://example.com/huge.jpg" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: UPLOAD_ERRORS.FILE_TOO_LARGE });

      vi.unstubAllGlobals();
    });

    it("returns 500 when imagekit.upload throws", async () => {
      vi.mocked(imagekit.upload).mockRejectedValue(new Error("ImageKit error"));

      const res = await POST(makeJsonRequest({ file: "base64data==" }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Internal server error" });
    });
  });

  describe("multipart/form-data", () => {
    it("returns 400 when no file in form data", async () => {
      const form = new FormData();
      const req = new Request("http://localhost/api/images/upload", {
        method: "POST",
        body: form,
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "No file provided" });
    });

    it("uploads file from form data", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as never);

      const form = new FormData();
      const file = new File(["image data"], "photo.jpg", {
        type: "image/jpeg",
      });
      form.append("file", file);

      const req = new Request("http://localhost/api/images/upload", {
        method: "POST",
        body: form,
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        url: mockUploadResult.url,
        fileId: mockUploadResult.fileId,
      });
      expect(imagekit.upload).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: "photo.jpg", folder: "/recipes" }),
      );
    });

    it("returns 400 when file type is not an allowed image type", async () => {
      const form = new FormData();
      const file = new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" });
      form.append("file", file);

      const req = new Request("http://localhost/api/images/upload", {
        method: "POST",
        body: form,
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: UPLOAD_ERRORS.UNSUPPORTED_TYPE });
    });

    it("returns 400 when file exceeds 10 MB", async () => {
      const form = new FormData();
      const oversizedContent = new Uint8Array(10 * 1024 * 1024 + 1);
      const file = new File([oversizedContent], "huge.jpg", {
        type: "image/jpeg",
      });
      form.append("file", file);

      const req = new Request("http://localhost/api/images/upload", {
        method: "POST",
        body: form,
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: UPLOAD_ERRORS.FILE_TOO_LARGE });
    });
  });
});
