import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/upload/upload-token", () => ({
  verifyUploadToken: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceUploadRateLimit: vi.fn(),
}));

import { auth } from "@/lib/auth/auth";
import { enforceUploadRateLimit } from "@/lib/rate-limit";
import { verifyUploadToken } from "@/lib/upload/upload-token";
import {
  requireUploadAuth,
  requireUploadAuthOrRateLimit,
} from "../upload-auth";

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

describe("requireUploadAuthOrRateLimit", () => {
  it("returns null and skips the rate limit when a valid session exists", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: "user-1" },
    } as never);

    const result = await requireUploadAuthOrRateLimit(makeRequest());

    expect(result).toBeNull();
    expect(enforceUploadRateLimit).not.toHaveBeenCalled();
  });

  it("returns null and skips the rate limit when a valid upload token exists", async () => {
    vi.mocked(verifyUploadToken).mockResolvedValue(true);

    const result = await requireUploadAuthOrRateLimit(
      makeRequest("valid-token"),
    );

    expect(result).toBeNull();
    expect(enforceUploadRateLimit).not.toHaveBeenCalled();
  });

  it("falls through to the rate limiter when neither session nor token is present", async () => {
    vi.mocked(enforceUploadRateLimit).mockResolvedValue(null);

    const request = makeRequest();
    const result = await requireUploadAuthOrRateLimit(request);

    expect(result).toBeNull();
    expect(enforceUploadRateLimit).toHaveBeenCalledWith(request);
  });

  it("returns the 429 from the rate limiter once the anonymous allowance is exhausted", async () => {
    const rateLimited = NextResponse.json(
      { error: "too many" },
      { status: 429 },
    );
    vi.mocked(enforceUploadRateLimit).mockResolvedValue(rateLimited);

    const result = await requireUploadAuthOrRateLimit(makeRequest());

    expect(result?.status).toBe(429);
  });
});
