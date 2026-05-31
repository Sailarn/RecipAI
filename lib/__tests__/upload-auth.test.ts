import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/upload-token", () => ({
  verifyUploadToken: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { verifyUploadToken } from "@/lib/upload-token";
import { requireUploadAuth } from "../upload-auth";

function makeRequest(uploadToken?: string) {
  return new Request("http://localhost/api/images/upload", {
    method: "POST",
    headers: uploadToken ? { "x-upload-token": uploadToken } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth.api.getSession).mockResolvedValue(null);
});

describe("requireUploadAuth", () => {
  it("returns null when a valid session exists", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    const result = await requireUploadAuth(makeRequest());

    expect(result).toBeNull();
    expect(verifyUploadToken).not.toHaveBeenCalled();
  });

  it("returns 401 when no session and no token", async () => {
    const result = await requireUploadAuth(makeRequest());

    expect(result?.status).toBe(401);
  });

  it("returns 401 when no session and token is invalid", async () => {
    vi.mocked(verifyUploadToken).mockResolvedValue(false);

    const result = await requireUploadAuth(makeRequest("bad-token"));

    expect(result?.status).toBe(401);
    expect(verifyUploadToken).toHaveBeenCalledWith("bad-token");
  });

  it("returns null when no session but token is valid", async () => {
    vi.mocked(verifyUploadToken).mockResolvedValue(true);

    const result = await requireUploadAuth(makeRequest("valid-token"));

    expect(result).toBeNull();
  });

  it("skips token check entirely when session is present", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    await requireUploadAuth(makeRequest("some-token"));

    expect(verifyUploadToken).not.toHaveBeenCalled();
  });
});
