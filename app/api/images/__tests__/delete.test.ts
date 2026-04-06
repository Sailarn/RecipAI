import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/imagekit", () => ({
  imagekit: {
    deleteFile: vi.fn(),
  },
}));

import { imagekit } from "@/lib/imagekit";
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
});

describe("DELETE /api/images/delete", () => {
  it("returns 400 when fileId is missing", async () => {
    const res = await DELETE(makeRequest({}));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "No fileId provided" });
  });

  it("returns success:true when file is deleted", async () => {
    vi.mocked(imagekit.deleteFile).mockResolvedValue(undefined as any);

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

  it("returns 500 for other errors", async () => {
    vi.mocked(imagekit.deleteFile).mockRejectedValue(
      new Error("Network timeout"),
    );

    const res = await DELETE(makeRequest({ fileId: "file-123" }));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Image deletion failed" });
  });
});
