import { headers } from "next/headers";
import type { NextResponse } from "next/server";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type SessionResult =
  | { session: Session; response?: undefined }
  | { session?: undefined; response: NextResponse };

/**
 * Gate an API route on an authenticated session. Returns `{ session }` when a
 * valid session exists, or `{ response }` (a 401) when it does not — mirroring
 * the `requireUploadAuth` convention.
 *
 * Use for routes that require a logged-in user. Routes that intentionally allow
 * anonymous access (e.g. parse-queue) should keep calling `getSession` directly.
 *
 *   const authed = await requireSession();
 *   if (authed.response) return authed.response;
 *   // authed.session is typed and non-null here
 */
export async function requireSession(): Promise<SessionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { response: ApiError.unauthorized() };
  return { session };
}
