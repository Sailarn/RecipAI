import type { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { EMBED_RATE_LIMIT, PARSE_RATE_LIMIT } from "@/lib/api-limits";
import { redis } from "@/lib/redis";
import { log, trackEvent } from "@/lib/telemetry";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window counter in Redis. INCR is atomic; the window is set on the first
 * hit via EXPIRE. The exact TTL is only read on the blocked path (for Retry-After),
 * so the happy path costs one round-trip.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) await redis.expire(redisKey, windowSeconds);

  if (count <= limit) {
    return {
      allowed: true,
      remaining: limit - count,
      resetSeconds: windowSeconds,
    };
  }

  const ttl = await redis.ttl(redisKey);
  return {
    allowed: false,
    remaining: 0,
    resetSeconds: ttl >= 0 ? ttl : windowSeconds,
  };
}

/** Identify the caller: signed-in user id, else the client IP. */
export function clientKey(req: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `ip:${ip}`;
}

/**
 * Enforce the shared AI-parse limit for a request. Returns a 429 response when
 * over the limit, or null to proceed. Fails open (allows) when Redis is
 * unavailable, capturing the error — availability over strict limiting.
 */
export async function enforceParseRateLimit(
  req: Request,
  userId?: string,
): Promise<NextResponse | null> {
  const { limit, windowSeconds } = userId
    ? PARSE_RATE_LIMIT.USER
    : PARSE_RATE_LIMIT.ANON;
  try {
    const result = await rateLimit(
      `parse:${clientKey(req, userId)}`,
      limit,
      windowSeconds,
    );
    if (!result.allowed) {
      const callerType = userId ? "user" : "anon";
      log("warn", "rate_limit_hit", { caller_type: callerType });
      trackEvent("rate_limit_hit", { caller_type: callerType });
      return ApiError.rateLimited(result.resetSeconds);
    }
  } catch (error) {
    ApiError.capture(error, req);
  }
  return null;
}

/**
 * Enforce the embedding-match limit for the public embed routes. Returns a 429
 * response when over the limit, or null to proceed. Fails open (allows) when
 * Redis is unavailable, capturing the error — availability over strict limiting.
 */
export async function enforceEmbedRateLimit(
  req: Request,
  userId?: string,
): Promise<NextResponse | null> {
  const { limit, windowSeconds } = userId
    ? EMBED_RATE_LIMIT.USER
    : EMBED_RATE_LIMIT.ANON;
  try {
    const result = await rateLimit(
      `embed:${clientKey(req, userId)}`,
      limit,
      windowSeconds,
    );
    if (!result.allowed) {
      const callerType = userId ? "user" : "anon";
      log("warn", "rate_limit_hit", { caller_type: callerType });
      trackEvent("rate_limit_hit", { caller_type: callerType });
      return ApiError.rateLimited(result.resetSeconds);
    }
  } catch (error) {
    ApiError.capture(error, req);
  }
  return null;
}
