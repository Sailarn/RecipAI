import { NextResponse } from "next/server";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  MAINTENANCE_MODE_CODE,
} from "@/lib/maintenance-constants";
import { captureError } from "@/lib/telemetry";

export { MAINTENANCE_MODE_CODE };

export const API_ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  NOT_FOUND: "Not found",
  INTERNAL: "Internal server error",
  INVALID_BODY: "Invalid request body",
  TOO_MANY_REQUESTS:
    "Too many requests — please slow down and try again later.",
  MAINTENANCE: DEFAULT_MAINTENANCE_MESSAGE,
} as const;

const MAINTENANCE_RETRY_AFTER_SECONDS = 30;

function captureWithContext(error: unknown, req?: Request) {
  captureError(error, {
    tags: {
      "http.method": req?.method ?? "unknown",
      "api.route": req ? new URL(req.url).pathname : "unknown",
    },
    extra: { url: req?.url },
  });
}

export const ApiError = {
  unauthorized: () =>
    NextResponse.json(
      { error: API_ERROR_MESSAGES.UNAUTHORIZED },
      { status: 401 },
    ),
  notFound: (message: string = API_ERROR_MESSAGES.NOT_FOUND) =>
    NextResponse.json({ error: message }, { status: 404 }),
  badRequest: (message: string) =>
    NextResponse.json({ error: message }, { status: 400 }),
  invalidBody: () =>
    NextResponse.json(
      { error: API_ERROR_MESSAGES.INVALID_BODY },
      { status: 400 },
    ),
  rateLimited: (retryAfterSeconds?: number) =>
    NextResponse.json(
      { error: API_ERROR_MESSAGES.TOO_MANY_REQUESTS },
      {
        status: 429,
        headers: retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : undefined,
      },
    ),
  maintenance: (message: string = API_ERROR_MESSAGES.MAINTENANCE) =>
    NextResponse.json(
      { error: message, code: MAINTENANCE_MODE_CODE },
      {
        status: 503,
        headers: { "Retry-After": String(MAINTENANCE_RETRY_AFTER_SECONDS) },
      },
    ),
  /** Capture an error in Sentry without changing the response — use when the
   *  catch block has its own response logic (e.g. retry handling). */
  capture: (error: unknown, req?: Request) => captureWithContext(error, req),
  /** Capture an error in Sentry and return a 500 response. The real error
   *  always goes to Sentry; pass `userMessage` to show the client a friendlier
   *  message than the generic default instead of leaking the raw cause. */
  internal: (error?: unknown, req?: Request, userMessage?: string) => {
    if (error !== undefined) captureWithContext(error, req);
    return NextResponse.json(
      { error: userMessage ?? API_ERROR_MESSAGES.INTERNAL },
      { status: 500 },
    );
  },
};
