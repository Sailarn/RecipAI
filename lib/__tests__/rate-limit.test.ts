import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: { incr: vi.fn(), expire: vi.fn(), ttl: vi.fn() },
}));

import { redis } from "@/lib/redis";
import { trackEvent } from "@/lib/telemetry";
import { clientKey, enforceParseRateLimit, rateLimit } from "../rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rateLimit", () => {
  it("sets the window on the first hit and allows it", async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);

    const result = await rateLimit("k", 5, 3600);

    expect(redis.expire).toHaveBeenCalledWith("ratelimit:k", 3600);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("does not reset the window on later hits", async () => {
    vi.mocked(redis.incr).mockResolvedValue(3);

    const result = await rateLimit("k", 5, 3600);

    expect(redis.expire).not.toHaveBeenCalled();
    expect(result.allowed).toBe(true);
  });

  it("blocks and reports reset seconds once over the limit", async () => {
    vi.mocked(redis.incr).mockResolvedValue(6);
    vi.mocked(redis.ttl).mockResolvedValue(120);

    const result = await rateLimit("k", 5, 3600);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetSeconds).toBe(120);
  });
});

describe("clientKey", () => {
  it("keys by user id when signed in", () => {
    const req = new Request("http://x");
    expect(clientKey(req, "user-9")).toBe("user:user-9");
  });

  it("keys by the first forwarded IP when anonymous", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientKey(req)).toBe("ip:1.2.3.4");
  });

  it("falls back to unknown without an IP header", () => {
    expect(clientKey(new Request("http://x"))).toBe("ip:unknown");
  });
});

describe("enforceParseRateLimit", () => {
  it("returns null when under the limit", async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);

    const res = await enforceParseRateLimit(new Request("http://x"), "user-1");

    expect(res).toBeNull();
  });

  it("returns a 429 when over the limit", async () => {
    vi.mocked(redis.incr).mockResolvedValue(999);
    vi.mocked(redis.ttl).mockResolvedValue(60);

    const res = await enforceParseRateLimit(new Request("http://x"));

    expect(res?.status).toBe(429);
    expect(trackEvent).toHaveBeenCalledWith("rate_limit_hit", {
      caller_type: "anon",
    });
  });

  it("fails open (allows) when Redis errors", async () => {
    vi.mocked(redis.incr).mockRejectedValue(new Error("redis down"));

    const res = await enforceParseRateLimit(new Request("http://x"));

    expect(res).toBeNull();
  });
});
