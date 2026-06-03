import { redis } from "@/lib/redis";

const TOKEN_PREFIX = "upload_token:";
const TOKEN_TTL_SECONDS = 1800;

/**
 * Mints a short-lived upload token, stores it in Redis with a 30-minute TTL,
 * and returns the token string. The same token may be used for multiple uploads
 * within the TTL window (needed for recipes with cover image + step images).
 */
export async function mintUploadToken(): Promise<string> {
  const token = crypto.randomUUID();
  await redis.set(`${TOKEN_PREFIX}${token}`, "1", "EX", TOKEN_TTL_SECONDS);
  return token;
}

/** Returns true if the token exists in Redis (non-destructive — not consumed on verify). */
export async function verifyUploadToken(token: string): Promise<boolean> {
  const value = await redis.get(`${TOKEN_PREFIX}${token}`);
  return value !== null;
}
