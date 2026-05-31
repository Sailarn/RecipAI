import * as Sentry from "@sentry/nextjs";
import { isSignedIn } from "@/lib/session-state";

/**
 * Fire-and-forget fetch gated on auth state.
 *
 * - No-ops when the user is not signed in (avoids 401 noise from offline-first flows).
 * - Network errors (offline, aborted) are silently swallowed — expected in an offline-first app.
 * - HTTP errors (non-ok responses) are captured by Sentry — these indicate server or payload bugs.
 */
export function syncFetch(url: string, init?: RequestInit): void {
  if (!isSignedIn()) return;
  fetch(url, init)
    .then((res) => {
      if (!res.ok) {
        Sentry.captureException(
          new Error(`Sync ${init?.method ?? "GET"} ${url} → ${res.status}`),
        );
      }
    })
    .catch(() => {});
}
