import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/upload/imagekit", () => ({
  imagekit: {
    deleteFile: vi.fn(),
  },
}));
vi.mock("@/lib/upload/upload-auth", () => ({
  requireUploadAuth: vi.fn(),
}));

import { imagekit } from "@/lib/upload/imagekit";
import { requireUploadAuth } from "@/lib/upload/upload-auth";
import { DELETE } from "../delete/route";

function makeRequest(body: object) {
  return new Request("http://localhost/api/images/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authorised.
  vi.mocked(requireUploadAuth).mockResolvedValue(null);
});

describe("DELETE /api/images/delete", () => {
  describe("authentication", () => {
    it("returns 401 when requireUploadAuth rejects the request", async () => {
      vi.mocked(requireUploadAuth).mockResolvedValue(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }) as never,
      );

      const res = await DELETE(makeRequest({ fileId: "file-123" }));

      expect(res.status).toBe(401);
    });

    it("delegates auth decisions to requireUploadAuth", async () => {
      vi.mocked(imagekit.deleteFile).mockResolvedValue(undefined as never);

      await DELETE(makeRequest({ fileId: "file-123" }));

      expect(requireUploadAuth).toHaveBeenCalledOnce();
    });
  });

  describe("request validation", () => {
    it("returns 400 when fileId is missing", async () => {
      const res = await DELETE(makeRequest({}));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body).toEqual({ error: "fileId required" });
    });
  });

  describe("deletion", () => {
    it("returns success:true when file is deleted", async () => {
      vi.mocked(imagekit.deleteFile).mockResolvedValue(undefined as never);

      const res = await DELETE(makeRequest({ fileId: "file-123" }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
      expect(imagekit.deleteFile).toHaveBeenCalledWith("file-123");
    });

    it("returns success:true when file does not exist (graceful)", async () => {
      vi.mocked(imagekit.deleteFile).mockRejectedValue(
        new Error("File does not exist"),
      );

      const res = await DELETE(makeRequest({ fileId: "file-ghost" }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
    });

    it("returns success:true when ImageKit rejects with its plain-object error", async () => {
      vi.mocked(imagekit.deleteFile).mockRejectedValue({
        message: "The requested file does not exist.",
        help: "For support kindly contact us at support@imagekit.io .",
      });

      const res = await DELETE(makeRequest({ fileId: "file-ghost" }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
    });

    it("does not 500 on ImageKit's transient internal error (best-effort cleanup)", async () => {
      vi.mocked(imagekit.deleteFile).mockRejectedValue(
        new Error(
          "We have experienced an internal error while processing your request.",
        ),
      );

      const res = await DELETE(makeRequest({ fileId: "file-123" }));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: false });
    });

    it("returns 500 for other errors", async () => {
      vi.mocked(imagekit.deleteFile).mockRejectedValue(
        new Error("Network timeout"),
      );

      const res = await DELETE(makeRequest({ fileId: "file-123" }));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "Internal server error" });
    });
  });
});
