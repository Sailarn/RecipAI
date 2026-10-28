import {
  APIConnectionError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@imagekit/nodejs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockDeleteFile,
  mockGetTags,
  mockInUseByOthers,
  mockRequireUploadAuth,
  mockInternal,
} = vi.hoisted(() => ({
  mockDeleteFile: vi.fn(),
  mockGetTags: vi.fn(),
  mockInUseByOthers: vi.fn(),
  mockRequireUploadAuth: vi.fn(),
  mockInternal: vi.fn(),
}));

vi.mock("@/lib/upload/imagekit", () => ({
  deleteFromImageKit: mockDeleteFile,
  getImageKitFileTags: mockGetTags,
}));
vi.mock("@/lib/upload/image-references", () => ({
  isImageInUseByOthers: mockInUseByOthers,
}));
vi.mock("@/lib/upload/upload-auth", () => ({
  requireUploadAuth: mockRequireUploadAuth,
}));
vi.mock("@/lib/api-errors", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-errors")>();
  return { ApiError: { ...actual.ApiError, internal: mockInternal } };
});
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn() } }));

import { DELETE } from "../route";

const OWNER = { userId: "owner" };

function deleteRequest(body: unknown) {
  return new Request("http://localhost/api/images/delete", {
    method: "DELETE",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUploadAuth.mockResolvedValue({ caller: OWNER });
  mockGetTags.mockResolvedValue(["owner-user-owner"]);
  mockInUseByOthers.mockResolvedValue(false);
  mockDeleteFile.mockResolvedValue(undefined);
  mockInternal.mockReturnValue(new Response(null, { status: 500 }));
});

describe("DELETE /api/images/delete", () => {
  describe("request validation", () => {
    it("returns the auth error for an unauthorised caller", async () => {
      const unauthorized = new Response(null, { status: 401 });
      mockRequireUploadAuth.mockResolvedValue({ response: unauthorized });

      expect(await DELETE(deleteRequest({ fileId: "f1" }))).toBe(unauthorized);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it("rejects malformed JSON", async () => {
      expect((await DELETE(deleteRequest("{"))).status).toBe(400);
    });

    it("rejects a body without fileId", async () => {
      expect((await DELETE(deleteRequest({}))).status).toBe(400);
    });
  });

  describe("ownership", () => {
    it("deletes a file tagged with the caller", async () => {
      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(mockDeleteFile).toHaveBeenCalledWith("f1");
      expect(response.status).toBe(200);
    });

    it("refuses a file tagged with another user", async () => {
      mockGetTags.mockResolvedValue(["owner-user-someone-else"]);

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(response.status).toBe(403);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it("refuses a parse-cache file, which other users' recipes share", async () => {
      mockGetTags.mockResolvedValue(["owner-parse-cache"]);

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(response.status).toBe(403);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it("refuses an anonymous upload", async () => {
      mockGetTags.mockResolvedValue(["owner-anonymous"]);

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(response.status).toBe(403);
    });

    it("deletes an untagged file nobody else uses", async () => {
      mockGetTags.mockResolvedValue([]);

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(mockInUseByOthers).toHaveBeenCalledWith("f1", OWNER);
      expect(mockDeleteFile).toHaveBeenCalledWith("f1");
      expect(response.status).toBe(200);
    });

    it("refuses an untagged file still used by someone else", async () => {
      mockGetTags.mockResolvedValue(["unrelated-tag"]);
      mockInUseByOthers.mockResolvedValue(true);

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(response.status).toBe(403);
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });

    it("treats a file that is already gone as deleted", async () => {
      mockGetTags.mockRejectedValue(
        new NotFoundError(404, undefined, "not found", new Headers()),
      );

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(await response.json()).toEqual({ success: true });
      expect(mockDeleteFile).not.toHaveBeenCalled();
    });
  });

  describe("ImageKit outcomes", () => {
    it("deletes the file", async () => {
      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(mockDeleteFile).toHaveBeenCalledWith("f1");
      expect(await response.json()).toEqual({ success: true });
    });

    it("treats an already-deleted file as success", async () => {
      mockDeleteFile.mockRejectedValue(
        new NotFoundError(
          404,
          undefined,
          "The requested file does not exist.",
          new Headers(),
        ),
      );

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(await response.json()).toEqual({ success: true });
      expect(mockInternal).not.toHaveBeenCalled();
    });

    it("answers success: false without reporting on an ImageKit internal error", async () => {
      mockDeleteFile.mockRejectedValue(
        new InternalServerError(
          500,
          undefined,
          "We have encountered an internal error.",
          new Headers(),
        ),
      );

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(await response.json()).toEqual({ success: false });
      expect(mockInternal).not.toHaveBeenCalled();
    });

    it("answers success: false without reporting when ImageKit is unreachable", async () => {
      mockDeleteFile.mockRejectedValue(
        new APIConnectionError({ message: "Connection error." }),
      );

      const response = await DELETE(deleteRequest({ fileId: "f1" }));

      expect(await response.json()).toEqual({ success: false });
      expect(mockInternal).not.toHaveBeenCalled();
    });

    it("reports a rejected request as a 500", async () => {
      const failure = new BadRequestError(
        400,
        undefined,
        "Your request contains invalid fileId",
        new Headers(),
      );
      mockDeleteFile.mockRejectedValue(failure);

      const response = await DELETE(deleteRequest({ fileId: "bad" }));

      expect(response.status).toBe(500);
      expect(mockInternal).toHaveBeenCalledWith(failure, expect.any(Request));
    });
  });
});
