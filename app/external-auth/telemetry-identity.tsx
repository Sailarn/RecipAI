"use client";

import { useTelemetryIdentity } from "@/lib/hooks/use-telemetry-identity";

/**
 * Attaches this origin's anonymous PostHog identity to the signed-in user.
 *
 * These pages are served from the auth host (`auth.recipai.pp.ua`), a different
 * origin from the app, and PostHog persistence is per-origin — so they start
 * with their own anonymous distinct id. Without an `identify` call it never
 * merges, and every visit to the account-linking or device sign-in flow shows
 * up as a separate person: the linking flow is exactly where someone connects
 * an extra account, which is why "one user with several connected accounts"
 * looked like several users.
 *
 * The cross-origin part does not need solving. PostHog merges on the server by
 * distinct id, so identifying this origin's anonymous id as the same user id
 * the app reports folds the two together retroactively.
 *
 * Rendered by the layout so it covers every page under `/external-auth`, the
 * way ClientShell does for the app.
 */
export function TelemetryIdentity() {
  useTelemetryIdentity();
  return null;
}
