// better-auth statuses that represent a routine, expected client error (a
// denied login, a malformed request, a rate limit). Reporting these to Sentry
// would flood it with normal auth traffic, so they are skipped.
const EXPECTED_CLIENT_ERROR_STATUSES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "UNPROCESSABLE_ENTITY",
  "TOO_MANY_REQUESTS",
]);

/**
 * Decide whether a better-auth API error is worth reporting to Sentry.
 *
 * The auth endpoints (`/api/auth/*`) are served by better-auth's own handler,
 * so their failures never pass through our `ApiError` wrapper. Without this
 * hook a genuine 500 — e.g. a new Mini App user failing to insert because
 * `user.email` is NOT NULL — is completely invisible. We report every
 * unexpected error (a raw throw with no string `status`, or a 500) and skip the
 * routine 4xx client errors that are normal auth traffic.
 */
export function shouldReportAuthError(error: unknown): boolean {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (typeof status !== "string") return true;
  return !EXPECTED_CLIENT_ERROR_STATUSES.has(status);
}
