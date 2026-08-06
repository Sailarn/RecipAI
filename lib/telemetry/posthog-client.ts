import type { PostHog } from "posthog-js";
import { getBuildId } from "@/lib/build-id";
import { clientTelemetryEnabled } from "./environment";
import type { EventName, TelemetryEvents } from "./events";

// posthog-js is ~62 KB gzipped and, via a static import here, was part of the
// root client bundle — parsed on every cold start before the app itself, even
// when telemetry was disabled. It is loaded on demand instead, so it stays off
// the boot path. Calls made while the load is in flight are queued and
// replayed, so deferring init costs no events.
type Status = "idle" | "loading" | "ready" | "unavailable";

let client: PostHog | null = null;
let status: Status = "idle";
const queuedCalls: ((posthog: PostHog) => void)[] = [];

function markReady(posthog: PostHog): void {
  client = posthog;
  status = "ready";
  for (const call of queuedCalls) call(posthog);
  queuedCalls.length = 0;
}

function markUnavailable(): void {
  status = "unavailable";
  queuedCalls.length = 0;
}

export function initPostHogClient(): void {
  if (status !== "idle") return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || !clientTelemetryEnabled()) {
    markUnavailable();
    return;
  }

  status = "loading";
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: "/ingest",
        ui_host: "https://eu.posthog.com",
        capture_pageview: "history_change",
        capture_pageleave: true,
        persistence: "localStorage+cookie",
        session_recording: { maskAllInputs: true },
      });
      // Super-property: rides along on every event from here on, so "which
      // build was this user running" is a filter rather than an investigation.
      // A device pinned to an old build by a stale cache is visible as events
      // arriving with a build_id that is no longer the deployed one.
      posthog.register({ build_id: getBuildId() });
      markReady(posthog);
    })
    .catch(markUnavailable);
}

/** Run against the live client, queueing if the vendor bundle is still loading. */
function withClient(call: (posthog: PostHog) => void): void {
  initPostHogClient();
  if (status === "ready" && client) {
    call(client);
    return;
  }
  // "unavailable" (no key, telemetry off, or a failed load) drops the call
  // rather than growing the queue forever.
  if (status === "loading") queuedCalls.push(call);
}

export function captureClientEvent<E extends EventName>(
  name: E,
  properties?: TelemetryEvents[E],
): void {
  withClient((posthog) => posthog.capture(name, properties));
}

export function identifyClient(
  userId: string,
  personProperties?: Record<string, unknown>,
): void {
  withClient((posthog) => posthog.identify(userId, personProperties));
}

export function resetClient(): void {
  // Nothing to reset if the vendor never loaded — and unlike capture/identify
  // there is no value in queueing a reset for a client with no state yet.
  if (status !== "ready" || !client) return;
  client.reset();
}
