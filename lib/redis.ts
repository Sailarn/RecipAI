import Redis from "ioredis";

declare global {
  var _redisClient: Redis | undefined;
}

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL environment variable is not set");
  return new Redis(url, { lazyConnect: true });
}

const client = globalThis._redisClient ?? createRedisClient();
globalThis._redisClient = client;

export const redis = client;
