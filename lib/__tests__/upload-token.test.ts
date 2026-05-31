import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

import { redis } from "@/lib/redis";
import { mintUploadToken, verifyUploadToken } from "../upload-token";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mintUploadToken", () => {
  it("stores the token in Redis with a 1800-second TTL", async () => {
    vi.mocked(redis.set).mockResolvedValue("OK");

    const token = await mintUploadToken();

    expect(redis.set).toHaveBeenCalledWith(
      `upload_token:${token}`,
      "1",
      "EX",
      1800,
    );
  });

  it("returns a UUID string", async () => {
    vi.mocked(redis.set).mockResolvedValue("OK");

    const token = await mintUploadToken();

    expect(typeof token).toBe("string");
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns a different token on each call", async () => {
    vi.mocked(redis.set).mockResolvedValue("OK");

    const token1 = await mintUploadToken();
    const token2 = await mintUploadToken();

    expect(token1).not.toBe(token2);
  });
});

describe("verifyUploadToken", () => {
  it("returns true when token exists in Redis", async () => {
    vi.mocked(redis.get).mockResolvedValue("1");

    const result = await verifyUploadToken("valid-token");

    expect(result).toBe(true);
    expect(redis.get).toHaveBeenCalledWith("upload_token:valid-token");
  });

  it("returns false when token is not found in Redis", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);

    const result = await verifyUploadToken("expired-token");

    expect(result).toBe(false);
  });
});
