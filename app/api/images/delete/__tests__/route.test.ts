import {
  APIConnectionError,
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@imagekit/nodejs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDeleteFile, mockRequireUploadAuth, mockInternal } = vi.hoisted(
  () => ({
    mockDeleteFile: vi.fn(),
    mockRequireUploadAuth: vi.fn(),
    mockInternal: vi.fn(),
  }),
);

vi.mock("@/lib/upload/imagekit", () => ({
  deleteFromImageKit: mockDeleteFile,
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

function deleteRequest(body: unknown) {
  return new Request("http://localhost/api/images/delete", {
    method: "DELETE",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUploadAuth.mockResolvedValue(null);
  mockDeleteFile.mockResolvedValue(undefined);
  mockInternal.mockReturnValue(new Response(null, { status: 500 }));
});

describe("DELETE /api/images/delete", () => {
  describe("request validation", () => {
    it("returns the auth error for an unauthorised caller", async () => {
      const unauthorized = new Response(null, { status: 401 });
      mockRequireUploadAuth.mockResolvedValue(unauthorized);

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
