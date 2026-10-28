import { headers } from "next/headers";
import type { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";
import { enforceUploadRateLimit } from "@/lib/rate-limit";
import { verifyUploadToken } from "@/lib/upload/upload-token";

/** Who is making an image request: a signed-in user, or a parse's upload token. */
export type UploadCaller = { userId: string } | { uploadToken: string };

type UploadCallerResult =
  | { caller: UploadCaller; response?: undefined }
  | { caller?: undefined; response: NextResponse };

type OptionalUploadCallerResult =
  | { caller: UploadCaller | null; response?: undefined }
  | { caller?: undefined; response: NextResponse };

/** The session's user, else a valid one-time upload token, else null. */
async function resolveUploadCaller(
  request: Request,
): Promise<UploadCaller | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) return { userId: session.user.id };

  const token = request.headers.get("x-upload-token");
  if (token && (await verifyUploadToken(token))) return { uploadToken: token };
  return null;
}

/**
 * Gate image *deletion* on a session or a valid upload token: `{ caller }`
 * when either is present, otherwise `{ response }` (a 401). Ownership of the
 * file itself is checked separately — see `lib/upload/image-ownership.ts`.
 */
export async function requireUploadAuth(
  request: Request,
): Promise<UploadCallerResult> {
  const caller = await resolveUploadCaller(request);
  return caller ? { caller } : { response: ApiError.unauthorized() };
}

/**
 * Gate an image *upload*: a valid session or upload token bypasses limits
 * entirely (parse flow, signed-in edits); otherwise the request is allowed but
 * IP-rate-limited (`caller: null`), so editing a recipe without being signed in
 * can still add/replace photos. Returns `{ response }` (a 429) only once that
 * anonymous allowance is exhausted.
 */
export async function requireUploadAuthOrRateLimit(
  request: Request,
): Promise<OptionalUploadCallerResult> {
  const caller = await resolveUploadCaller(request);
  if (caller) return { caller };
  const limited = await enforceUploadRateLimit(request);
  return limited ? { response: limited } : { caller: null };
}
