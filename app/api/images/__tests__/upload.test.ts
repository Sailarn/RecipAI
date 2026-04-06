import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/imagekit", () => ({
  imagekit: {
    upload: vi.fn(),
  },
}));

import { imagekit } from "@/lib/imagekit";
import { POST } from "../upload/route";

const mockUploadResult = {
  url: "https://ik.imagekit.io/test/recipe.jpg",
  fileId: "file-123",
};

function makeJsonRequest(body: object) {
  return new Request("http://localhost/api/images/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/images/upload", () => {
  describe("JSON body (url or base64)", () => {
    it("returns 400 when no image source provided", async () => {
      const res = await POST(makeJsonRequest({}));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "No image source provided" });
    });

    it("uploads base64 file and returns url and fileId", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as any);

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
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as any);

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
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as any);

      await POST(makeJsonRequest({ file: "base64data==" }));

      expect(imagekit.upload).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: expect.stringMatching(/^recipe-\d+$/),
          folder: "/recipes",
        }),
      );
    });

    it("fetches image from URL and uploads it", async () => {
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as any);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await POST(
        makeJsonRequest({ url: "https://example.com/image.jpg" }),
      );

      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/image.jpg");

      vi.unstubAllGlobals();
    });

    it("returns 400 when URL fetch fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      vi.stubGlobal("fetch", mockFetch);

      const res = await POST(
        makeJsonRequest({ url: "https://example.com/image.jpg" }),
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "Failed to fetch image from URL" });

      vi.unstubAllGlobals();
    });

    it("returns 500 when imagekit.upload throws", async () => {
      vi.mocked(imagekit.upload).mockRejectedValue(new Error("ImageKit error"));

      const res = await POST(makeJsonRequest({ file: "base64data==" }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Image upload failed" });
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
      vi.mocked(imagekit.upload).mockResolvedValue(mockUploadResult as any);

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
  });
});
