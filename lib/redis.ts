import Redis from "ioredis";

declare global {
  var _redisClient: Redis | undefined;
}

function getRedisClient(): Redis {
  if (globalThis._redisClient) return globalThis._redisClient;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL environment variable is not set");
  globalThis._redisClient = new Redis(url, { lazyConnect: true });
  return globalThis._redisClient;
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
