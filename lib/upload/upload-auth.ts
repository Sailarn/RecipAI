import { headers } from "next/headers";
import type { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { enforceUploadRateLimit } from "@/lib/rate-limit";
import { verifyUploadToken } from "@/lib/upload/upload-token";

/** True if the request carries a session or a valid one-time upload token. */
async function hasUploadCredential(request: Request): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return true;

  const token = request.headers.get("x-upload-token");
  if (!token) return false;

  return verifyUploadToken(token);
}

/**
 * Returns null if the request is authorised for image *deletion*
 * (a valid session OR a valid upload token is sufficient),
 * or a 401 response if neither is present. Deletion stays hard-gated —
 * it's already best-effort cleanup on every caller, so an unauthorised
 * request just orphans a file rather than losing user data.
 */
export async function requireUploadAuth(
  request: Request,
): Promise<NextResponse | null> {
  const authorised = await hasUploadCredential(request);
  return authorised ? null : ApiError.unauthorized();
}

/**
 * Returns null if the request may proceed with an image *upload* — a valid
 * session or upload token bypasses limits entirely (parse flow, signed-in
 * edits); otherwise the request is allowed but IP-rate-limited, so editing a
 * recipe without being signed in can still add/replace photos. Returns a 429
 * only once that anonymous allowance is exhausted.
 */
export async function requireUploadAuthOrRateLimit(
  request: Request,
): Promise<NextResponse | null> {
  if (await hasUploadCredential(request)) return null;
  return enforceUploadRateLimit(request);
}
