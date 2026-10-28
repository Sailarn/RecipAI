import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUpload, mockAuth, mockResolve, mockInternal } = vi.hoisted(() => ({
  mockUpload: vi.fn(),
  mockAuth: vi.fn(),
  mockResolve: vi.fn(),
  mockInternal: vi.fn(),
}));

vi.mock("@/lib/upload/imagekit", () => ({ uploadToImageKit: mockUpload }));
vi.mock("@/lib/upload/upload-auth", () => ({
  requireUploadAuthOrRateLimit: mockAuth,
}));
vi.mock("@/lib/upload/upload-image-source", () => ({
  resolveImageSource: mockResolve,
}));
vi.mock("@/lib/api-errors", () => ({ ApiError: { internal: mockInternal } }));

import { POST } from "../route";

const request = new Request("http://localhost/api/images/upload", {
  method: "POST",
});

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({ caller: null });
  mockResolve.mockResolvedValue({
    ok: true,
    source: { fileData: "AQID", fileName: "a.jpg" },
  });
  mockInternal.mockReturnValue(new Response(null, { status: 500 }));
});

describe("POST /api/images/upload", () => {
  it("returns the auth/rate-limit response without reading the body", async () => {
    const denied = new Response(null, { status: 429 });
    mockAuth.mockResolvedValue({ response: denied });

    expect(await POST(request)).toBe(denied);
    expect(mockResolve).not.toHaveBeenCalled();
  });

  it("returns the resolver's validation response", async () => {
    const invalid = new Response(null, { status: 400 });
    mockResolve.mockResolvedValue({ ok: false, response: invalid });

    expect(await POST(request)).toBe(invalid);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("uploads to the recipes folder and answers the url and file id", async () => {
    mockUpload.mockResolvedValue({
      url: "https://ik.test/a.jpg",
      fileId: "f1",
    });

    const response = await POST(request);

    expect(mockUpload).toHaveBeenCalledWith("AQID", "a.jpg", "owner-anonymous");
    expect(await response.json()).toEqual({
      url: "https://ik.test/a.jpg",
      fileId: "f1",
    });
  });

  it("tags a signed-in upload with its user", async () => {
    mockAuth.mockResolvedValue({ caller: { userId: "user-1" } });
    mockUpload.mockResolvedValue({
      url: "https://ik.test/a.jpg",
      fileId: "f1",
    });

    await POST(request);

    expect(mockUpload).toHaveBeenCalledWith(
      "AQID",
      "a.jpg",
      "owner-user-user-1",
    );
  });

  it("reports an ImageKit failure as a 500", async () => {
    const failure = new Error("ImageKit down");
    mockUpload.mockRejectedValue(failure);

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mockInternal).toHaveBeenCalledWith(failure, request);
  });
});
