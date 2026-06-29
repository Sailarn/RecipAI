import * as Sentry from "@sentry/nextjs";
import { maintenanceErrorFromResponse } from "@/lib/api/api-fetch";
import { isSignedIn } from "@/lib/auth/session-state";

/**
 * Fire-and-forget fetch gated on auth state.
 *
 * - No-ops when the user is not signed in (avoids 401 noise from offline-first flows).
 * - Network errors (offline, aborted) are silently swallowed — expected in an offline-first app.
 * - Maintenance 503s are expected (admin-initiated) and swallowed without noise.
 * - Other HTTP errors (non-ok responses) are captured by Sentry — these indicate server or payload bugs.
 *
 * Returns a promise that always resolves (never rejects) once the request
 * settles, so callers can sequence dependent syncs without handling errors.
 */
export function syncFetch(url: string, init?: RequestInit): Promise<void> {
  if (!isSignedIn()) return Promise.resolve();
  return fetch(url, init)
    .then(async (res) => {
      if (res.ok) return;
      if (await maintenanceErrorFromResponse(res)) return;
      Sentry.captureException(
        new Error(`Sync ${init?.method ?? "GET"} ${url} → ${res.status}`),
      );
    })
    .catch(() => {});
}
