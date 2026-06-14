import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisConstructor, redisGet, redisOn } = vi.hoisted(() => ({
  redisConstructor: vi.fn(),
  redisGet: vi.fn().mockResolvedValue("value"),
  redisOn: vi.fn(),
}));

vi.mock("ioredis", () => ({
  default: class {
    get = redisGet;
    on = redisOn;
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
    redisOn.mockClear();
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
    expect(redisConstructor).toHaveBeenCalledWith(
      "redis://localhost:6379",
      expect.objectContaining({ lazyConnect: true }),
    );
  });

  it("fails fast instead of retrying a command 20 times", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { redis } = await import("@/lib/redis");
    await redis.get("key");

    expect(redisConstructor).toHaveBeenCalledWith(
      "redis://localhost:6379",
      expect.objectContaining({ maxRetriesPerRequest: 3 }),
    );
  });

  it("attaches an error listener so connection failures aren't unhandled", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const { redis } = await import("@/lib/redis");
    await redis.get("key");

    expect(redisOn).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("throws only when used without REDIS_URL, not on import", async () => {
    const { redis } = await import("@/lib/redis");

    expect(() => redis.get).toThrow(
      "REDIS_URL environment variable is not set",
    );
  });
});
