import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisConstructor, redisGet } = vi.hoisted(() => ({
  redisConstructor: vi.fn(),
  redisGet: vi.fn().mockResolvedValue("value"),
}));

vi.mock("ioredis", () => ({
  default: class {
    get = redisGet;
    constructor(...args: unknown[]) {
      redisConstructor(...args);
    }
  },
}));

describe("lib/redis", () => {
  beforeEach(() => {
    vi.resetModules();
    redisConstructor.mockClear();
    redisGet.mockClear();
    globalThis._redisClient = undefined;
    delete process.env.REDIS_URL;
  });

  it("does not instantiate the client on import (a build evaluating the module needs no REDIS_URL)", async () => {
    const module = await import("@/lib/redis");

    expect(module.redis).toBeDefined();
    expect(redisConstructor).not.toHaveBeenCalled();
  });

  it("lazily creates the client on first use when REDIS_URL is set", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { redis } = await import("@/lib/redis");

    expect(redisConstructor).not.toHaveBeenCalled();
    await redis.get("key");

    expect(redisConstructor).toHaveBeenCalledOnce();
    expect(redisConstructor).toHaveBeenCalledWith("redis://localhost:6379", {
      lazyConnect: true,
    });
  });

  it("throws only when used without REDIS_URL, not on import", async () => {
    const { redis } = await import("@/lib/redis");

    expect(() => redis.get).toThrow(
      "REDIS_URL environment variable is not set",
    );
  });
});
