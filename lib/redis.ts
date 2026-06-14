import Redis from "ioredis";
import { logger } from "@/lib/logger";

declare global {
  var _redisClient: Redis | undefined;
}

function getRedisClient(): Redis {
  if (globalThis._redisClient) return globalThis._redisClient;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL environment variable is not set");
  const client = new Redis(url, {
    lazyConnect: true,
    // Fail fast (3 tries) instead of ioredis's default 20 — a misconfigured or
    // unreachable Redis should let callers fall back quickly (rate limiting
    // fails open) rather than stalling each request through 20 retries.
    maxRetriesPerRequest: 3,
  });
  // Without an "error" listener ioredis logs "[ioredis] Unhandled error event"
  // for every connection failure. Route them to the logger so a Redis outage
  // degrades quietly instead of spamming stderr.
  client.on("error", (error) => {
    logger.error("Redis connection error", error);
  });
  globalThis._redisClient = client;
  return client;
}

// Lazy proxy: importing this module never instantiates the client, so a build
// that only evaluates route modules (Next's page-data collection) doesn't need
// REDIS_URL. The real client is created on first property access — i.e. the
// first actual Redis call at request time.
export const redis = new Proxy({} as Redis, {
  get(_target, property) {
    const client = getRedisClient();
    const value = Reflect.get(client, property) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
